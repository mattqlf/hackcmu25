import { NextRequest, NextResponse } from "next/server";

interface ArxivPaper {
  id: string;
  title: string;
  abstract: string;
  authors?: string;
  published?: string;
  categories?: string;
}

async function fetchPaperMetadata(id: string): Promise<ArxivPaper> {
  try {
    // Use ArXiv API to get paper metadata
    const apiUrl = `http://export.arxiv.org/api/query?id_list=${id}`;

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "arXivSync/1.0 (mailto:support@arXivSync.com)"
      }
    });

    if (!response.ok) {
      throw new Error(`ArXiv API responded with status: ${response.status}`);
    }

    const xmlText = await response.text();

    // Parse the XML response to extract paper metadata
    const titleMatch = xmlText.match(/<title>(.*?)<\/title>/s);
    const summaryMatch = xmlText.match(/<summary>(.*?)<\/summary>/s);
    const authorMatches = xmlText.match(/<author>(.*?)<\/author>/gs);
    const publishedMatch = xmlText.match(/<published>(.*?)<\/published>/);
    const categoryMatches = xmlText.match(/term="([^"]+)"/g);

    const title = titleMatch ? titleMatch[1].trim().replace(/\n\s+/g, ' ') : `Paper ${id}`;
    const abstract = summaryMatch ? summaryMatch[1].trim().replace(/\n\s+/g, ' ') : '';

    // Extract author names
    const authors = authorMatches ?
      authorMatches.map(author => {
        const nameMatch = author.match(/<name>(.*?)<\/name>/);
        return nameMatch ? nameMatch[1].trim() : '';
      }).filter(name => name).join(', ') : '';

    const published = publishedMatch ? publishedMatch[1].trim() : '';

    // Extract categories
    const categories = categoryMatches ?
      categoryMatches.map(cat => cat.match(/term="([^"]+)"/)?.[1]).filter(Boolean).join(', ') : '';

    return {
      id,
      title,
      abstract,
      authors,
      published,
      categories
    };
  } catch (error) {
    console.error('Error fetching paper metadata:', error);
    // Return basic metadata if API fails
    return {
      id,
      title: `Paper ${id}`,
      abstract: `ArXiv paper ${id}`
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Paper ID is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch paper metadata from ArXiv API
    const paperData = await fetchPaperMetadata(id);

    // Try to fetch the HTML version
    const htmlUrl = `https://arxiv.org/html/${id}`;

    console.log(`Fetching ArXiv HTML from: ${htmlUrl}`);

    const response = await fetch(htmlUrl, {
      method: "GET",
      headers: {
        "User-Agent": "arXivSync/1.0 (mailto:support@arXivSync.com)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`ArXiv HTML responded with status: ${response.status}`);
    }

    const htmlContent = await response.text();

    // Extract the main content and clean it up
    const cleanedHtml = processArxivHtml(htmlContent, id);

    // Count images for debugging
    const imageMatches = cleanedHtml.match(/<img[^>]*>/gi) || [];
    const debugInfo = {
      originalImageCount: (htmlContent.match(/<img/g) || []).length,
      processedImageCount: imageMatches.length,
      sampleImages: imageMatches.slice(0, 3).map(img => {
        const srcMatch = img.match(/src=["']([^"']+)["']/);
        return srcMatch ? srcMatch[1] : 'no src found';
      })
    };

    console.log('Paper processing complete:', {
      id,
      htmlUrl,
      htmlLength: htmlContent.length,
      cleanedLength: cleanedHtml.length,
      ...debugInfo
    });

    return NextResponse.json({
      id: id,
      htmlContent: cleanedHtml,
      sourceUrl: htmlUrl,
      paperData: paperData,
      debug: debugInfo
    }, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("Error fetching ArXiv paper:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch paper from ArXiv",
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion: "This paper might not have an HTML version available. Try viewing the PDF on ArXiv directly."
      },
      { status: 500 }
    );
  }
}

function processArxivHtml(htmlContent: string, id: string): string {
  // Extract the main content area and include necessary styles
  // ArXiv HTML pages typically have the content in specific containers

  // First, let's try to extract the main article content
  const articleMatch = htmlContent.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    let articleContent = articleMatch[1];

    // Fix relative image URLs to use our proxy
    articleContent = articleContent.replace(
      /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
      (match, before, src, after) => {
        console.log(`Found image src: "${src}"`);

        // If it's a relative URL with leading slash, proxy it
        if (src.startsWith('/')) {
          const proxiedSrc = `/api/arxiv-image?url=${encodeURIComponent(src)}`;
          console.log(`Proxying relative URL: ${src} -> ${proxiedSrc}`);
          return `<img${before}src="${proxiedSrc}"${after}>`;
        }
        // If it's already a full URL to arxiv.org, proxy it too
        if (src.startsWith('https://arxiv.org/')) {
          const proxiedSrc = `/api/arxiv-image?url=${encodeURIComponent(src)}`;
          console.log(`Proxying arxiv.org URL: ${src} -> ${proxiedSrc}`);
          return `<img${before}src="${proxiedSrc}"${after}>`;
        }
        // Handle relative URLs without leading slash (like "x1.png", "figs/math_plot.png")
        if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('#')) {
          // Convert to full ArXiv HTML path
          const fullArxivPath = `/html/${id}/${src}`;
          const proxiedSrc = `/api/arxiv-image?url=${encodeURIComponent(fullArxivPath)}`;
          console.log(`Proxying relative path: ${src} -> ${fullArxivPath} -> ${proxiedSrc}`);
          return `<img${before}src="${proxiedSrc}"${after}>`;
        }
        // Handle data URLs
        if (src.startsWith('data:')) {
          console.log(`Found data URL, keeping as-is: ${src.substring(0, 50)}...`);
          return match;
        }

        console.log(`Unhandled image src: ${src}`);
        return match;
      }
    );

    // Fix relative links
    articleContent = articleContent.replace(
      /<a([^>]*?)href=["']\/([^"']+)["']([^>]*?)>/gi,
      `<a$1href="https://arxiv.org/$2"$3>`
    );

    // Also extract any style tags for ArXiv-specific styling
    const styleMatches = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
    let styles = styleMatches.join('\n');

    // Fix any CSS URLs that reference ArXiv assets
    styles = styles.replace(
      /url\(["']?\/([^"')]+)["']?\)/gi,
      'url("https://arxiv.org/$1")'
    );

    // Extract link tags for external stylesheets and fix URLs
    const linkMatches = htmlContent.match(/<link[^>]*rel=["\']stylesheet["\'][^>]*>/gi) || [];
    const links = linkMatches.map(link => {
      return link.replace(
        /href=["']\/([^"']+)["']/gi,
        'href="https://arxiv.org/$1"'
      );
    }).join('\n');

    // Extract MathJax script if present
    const mathJaxMatch = htmlContent.match(/<script[^>]*MathJax[^>]*>[\s\S]*?<\/script>/gi);
    const mathJaxScripts = mathJaxMatch ? mathJaxMatch.join('\n') : '';

    // Combine styles and content
    return `
      ${links}
      <style>
        ${styles}
      </style>
      ${mathJaxScripts}
      <div class="arxiv-paper-content">
        ${articleContent}
      </div>
    `;
  }

  // Fallback: try to extract the body content
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    let bodyContent = bodyMatch[1];

    // Fix image URLs in body content too
    bodyContent = bodyContent.replace(
      /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
      (match, before, src, after) => {
        if (src.startsWith('/') || src.startsWith('https://arxiv.org/')) {
          const proxiedSrc = `/api/arxiv-image?url=${encodeURIComponent(src)}`;
          return `<img${before}src="${proxiedSrc}"${after}>`;
        }
        // Handle relative URLs without leading slash
        if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('#')) {
          const fullArxivPath = `/html/${id}/${src}`;
          const proxiedSrc = `/api/arxiv-image?url=${encodeURIComponent(fullArxivPath)}`;
          return `<img${before}src="${proxiedSrc}"${after}>`;
        }
        return match;
      }
    );

    return `
      <div class="arxiv-paper-content">
        ${bodyContent}
      </div>
    `;
  }

  // Last resort: return the full HTML with image fixes
  let processedHtml = htmlContent.replace(
    /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, src, after) => {
      if (src.startsWith('/') || src.startsWith('https://arxiv.org/')) {
        const proxiedSrc = `/api/arxiv-image?url=${encodeURIComponent(src)}`;
        return `<img${before}src="${proxiedSrc}"${after}>`;
      }
      // Handle relative URLs without leading slash
      if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('#')) {
        const fullArxivPath = `/html/${id}/${src}`;
        const proxiedSrc = `/api/arxiv-image?url=${encodeURIComponent(fullArxivPath)}`;
        return `<img${before}src="${proxiedSrc}"${after}>`;
      }
      return match;
    }
  );

  return processedHtml;
}