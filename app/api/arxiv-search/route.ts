import { NextRequest, NextResponse } from "next/server";

function constructSearchQuery(userQuery: string): string {
  // Check if the user is already using ArXiv syntax (contains field prefixes like ti:, au:, abs:, etc.)
  const hasFieldPrefix = /\b(ti|au|abs|co|jr|cat|rn|all):/i.test(userQuery);

  if (hasFieldPrefix) {
    // User is using ArXiv syntax - handle multi-word queries properly
    // For field searches with multiple words, we need to quote the terms
    return userQuery.replace(/\b(ti|au|abs|co|jr|cat|rn|all):([^"]\S*(?:\s+\S+)*)/gi, (match, field, terms) => {
      // If terms contain spaces, wrap in quotes
      if (terms.trim().includes(' ')) {
        return `${field}:"${terms.trim()}"`;
      }
      return match;
    });
  } else {
    // Simple keyword search - use the format that works with arXiv
    const trimmedQuery = userQuery.trim();
    return `all:${trimmedQuery}`;
  }
}

interface ArxivPaper {
  id: string;
  title: string;
  abstract: string;
}

function extractArxivPapers(xmlData: string): ArxivPaper[] {
  const papers: ArxivPaper[] = [];

  // Parse XML to extract arXiv papers from <entry> elements
  const entryRegex = /<entry[^>]*>[\s\S]*?<\/entry>/g;
  const idRegex = /<id[^>]*>(.*?)<\/id>/;
  const titleRegex = /<title[^>]*>(.*?)<\/title>/s;
  const abstractRegex = /<summary[^>]*>(.*?)<\/summary>/s;

  const entries = xmlData.match(entryRegex) || [];

  for (const entry of entries) {
    const idMatch = entry.match(idRegex);
    const titleMatch = entry.match(titleRegex);
    const abstractMatch = entry.match(abstractRegex);

    if (idMatch && idMatch[1] && titleMatch && titleMatch[1] && abstractMatch && abstractMatch[1]) {
      // Extract just the arXiv ID from the full URL
      // Format: http://arxiv.org/abs/1234.5678v1 -> 1234.5678v1
      const fullUrl = idMatch[1].trim();
      const arxivId = fullUrl.replace(/^.*\/abs\//, '');

      // Clean up the title (remove extra whitespace and newlines)
      const title = titleMatch[1].replace(/\s+/g, ' ').trim();

      // Clean up the abstract (remove extra whitespace and newlines)
      const abstract = abstractMatch[1].replace(/\s+/g, ' ').trim();

      if (arxivId && arxivId !== fullUrl && title && abstract) {
        papers.push({
          id: arxivId,
          title: title,
          abstract: abstract
        });
      }
    }
  }

  return papers;
}

function extractTotalResults(xmlData: string): number {
  // Extract total results from OpenSearch metadata
  const totalResultsMatch = xmlData.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
  return totalResultsMatch ? parseInt(totalResultsMatch[1], 10) : 0;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");
  const start = parseInt(searchParams.get("start") || "0", 10);
  const maxResults = parseInt(searchParams.get("max_results") || "50", 10);

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 }
    );
  }

  // Limit max_results to prevent overwhelming the API (ArXiv recommends max 2000)
  const clampedMaxResults = Math.min(maxResults, 100);

  try {
    // ArXiv API base URL
    const baseUrl = "http://export.arxiv.org/api/query";

    // Construct the search query with improved logic
    const searchQuery = constructSearchQuery(query);
    const encodedSearchQuery = `search_query=${encodeURIComponent(searchQuery)}`;
    const pagination = `start=${start}&max_results=${clampedMaxResults}`;
    const sorting = "sortBy=submittedDate&sortOrder=descending"; // Sort by newest first
    const apiUrl = `${baseUrl}?${encodedSearchQuery}&${pagination}&${sorting}`;

    // Fetch data from ArXiv API
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "PaperSync/1.0 (mailto:support@papersync.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`ArXiv API responded with status: ${response.status}`);
    }

    // Get the XML content
    const xmlData = await response.text();

    // Parse XML and extract data
    const papers = extractArxivPapers(xmlData);
    const totalResults = extractTotalResults(xmlData);

    // Return the list of arXiv papers as JSON with pagination info
    return NextResponse.json({
      query: query,
      searchQuery: searchQuery,
      totalResults: totalResults,
      currentResults: papers.length,
      start: start,
      maxResults: clampedMaxResults,
      hasMore: start + clampedMaxResults < totalResults,
      papers: papers
    }, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error fetching from ArXiv API:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch data from ArXiv API",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}