import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json(
      { error: "Image URL is required" },
      { status: 400 }
    );
  }

  try {
    // Construct the full ArXiv URL
    let fullUrl: string;

    if (imageUrl.startsWith('http')) {
      fullUrl = imageUrl;
    } else if (imageUrl.startsWith('/')) {
      // Handle different ArXiv URL patterns
      if (imageUrl.startsWith('/html/')) {
        // For URLs like /html/2301.00001/image.png
        fullUrl = `https://arxiv.org${imageUrl}`;
      } else {
        // For other relative URLs
        fullUrl = `https://arxiv.org${imageUrl}`;
      }
    } else {
      // Relative URL without leading slash
      fullUrl = `https://arxiv.org/${imageUrl}`;
    }

    console.log(`Original URL: ${imageUrl}`);
    console.log(`Proxying image from: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "User-Agent": "ArXivDocs/1.0 (mailto:support@arxivdocs.com)",
        "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": "https://arxiv.org/",
        "Origin": "https://arxiv.org",
      },
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // Try alternative URL patterns if the first one fails
      const alternatives = [
        `https://arxiv.org/src/${imageUrl.replace(/^\/+/, '')}`,
        `https://arxiv.org/pdf/${imageUrl.replace(/^\/+/, '')}`,
        `https://export.arxiv.org${imageUrl}`,
      ];

      for (const altUrl of alternatives) {
        console.log(`Trying alternative URL: ${altUrl}`);
        try {
          const altResponse = await fetch(altUrl, {
            method: "GET",
            headers: {
              "User-Agent": "ArXivDocs/1.0 (mailto:support@arxivdocs.com)",
              "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
              "Referer": "https://arxiv.org/",
            },
          });

          if (altResponse.ok) {
            console.log(`Success with alternative URL: ${altUrl}`);
            const imageBuffer = await altResponse.arrayBuffer();
            const contentType = altResponse.headers.get('content-type') || 'image/png';

            return new NextResponse(imageBuffer, {
              status: 200,
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
              },
            });
          }
        } catch (altError) {
          console.log(`Alternative URL failed: ${altUrl}`, altError);
        }
      }

      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    console.log(`Successfully fetched image, content-type: ${contentType}, size: ${imageBuffer.byteLength} bytes`);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });

  } catch (error) {
    console.error("Error proxying image:", error);

    // Create a simple placeholder SVG image
    const placeholderSvg = `
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6c757d" font-family="Arial, sans-serif" font-size="14">
          Image could not be loaded
        </text>
        <text x="50%" y="70%" text-anchor="middle" dy=".3em" fill="#6c757d" font-family="Arial, sans-serif" font-size="12">
          ${imageUrl}
        </text>
      </svg>
    `;

    return new NextResponse(placeholderSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}