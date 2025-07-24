import { createMockDataService, SearchResult, DocumentChunk } from './mock-data-service';
import { createEventService } from './event-service';
import { logger } from '@cycletime/shared-utils';

export interface SearchOptions {
  indexId?: string;
  searchType?: 'semantic' | 'keyword' | 'hybrid';
  limit?: number;
  offset?: number;
  threshold?: number;
  filters?: SearchFilters;
  sort?: SearchSort;
  highlight?: HighlightOptions;
  includeMetadata?: boolean;
  includeChunks?: boolean;
  boostFields?: Record<string, number>;
}

export interface SearchFilters {
  documentTypes?: string[];
  languages?: string[];
  authors?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  tags?: string[];
  metadata?: Record<string, any>;
  minWordCount?: number;
  maxWordCount?: number;
}

export interface SearchSort {
  field: 'relevance' | 'date' | 'title' | 'wordCount';
  order: 'asc' | 'desc';
}

export interface HighlightOptions {
  enabled?: boolean;
  fields?: string[];
  fragmentSize?: number;
  maxFragments?: number;
  preTag?: string;
  postTag?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  offset: number;
  limit: number;
  processingTime: number;
  searchType: string;
  filters?: SearchFilters;
  facets?: SearchFacets;
  suggestions?: string[];
  metadata?: Record<string, any>;
}

export interface SearchFacets {
  documentTypes?: Array<{ value: string; count: number }>;
  languages?: Array<{ value: string; count: number }>;
  authors?: Array<{ value: string; count: number }>;
  tags?: Array<{ value: string; count: number }>;
  dateRanges?: Array<{ value: string; count: number }>;
}

export interface SimilaritySearchOptions {
  embeddings: number[];
  limit?: number;
  threshold?: number;
  indexId?: string;
  includeMetadata?: boolean;
}

export interface HybridSearchOptions extends SearchOptions {
  semanticWeight?: number;
  keywordWeight?: number;
  rerankResults?: boolean;
  diversityFactor?: number;
}

export function createSearchService(
  mockDataService: ReturnType<typeof createMockDataService>,
  eventService: ReturnType<typeof createEventService>
) {
  const search = async (query: string, options: SearchOptions = {}): Promise<SearchResponse> => {
    const startTime = Date.now();
    
    try {
      logger.info('Starting search', { query, options });
      
      const {
        indexId,
        searchType = 'semantic',
        limit = 10,
        offset = 0,
        threshold = 0.7,
        filters,
        sort,
        highlight,
        includeMetadata = true,
        includeChunks = false,
      } = options;

      // Validate query
      if (!query || query.trim().length === 0) {
        throw new Error('Search query cannot be empty');
      }

      // Perform search based on type
      let searchResults: SearchResult[] = [];
      
      switch (searchType) {
        case 'semantic':
          searchResults = await performSemanticSearch(query, options);
          break;
        case 'keyword':
          searchResults = await performKeywordSearch(query, options);
          break;
        case 'hybrid':
          searchResults = await performHybridSearch(query, options);
          break;
        default:
          throw new Error(`Unsupported search type: ${searchType}`);
      }

      // Apply filters
      if (filters) {
        searchResults = applyFilters(searchResults, filters);
      }

      // Apply sorting
      if (sort) {
        searchResults = applySorting(searchResults, sort);
      }

      // Apply pagination
      const total = searchResults.length;
      const paginatedResults = searchResults.slice(offset, offset + limit);

      // Apply highlighting
      if (highlight?.enabled) {
        paginatedResults.forEach(result => {
          result.highlights = generateHighlights(result.content, query, highlight);
        });
      }

      // Remove chunks if not requested
      if (!includeChunks) {
        paginatedResults.forEach(result => {
          result.chunks = [];
        });
      }

      // Remove metadata if not requested
      if (!includeMetadata) {
        paginatedResults.forEach(result => {
          result.metadata = {};
        });
      }

      const processingTime = Date.now() - startTime;

      // Generate search suggestions
      const suggestions = await generateSearchSuggestions(query);

      // Generate facets
      const facets = generateFacets(searchResults);

      const response: SearchResponse = {
        query,
        results: paginatedResults,
        total,
        offset,
        limit,
        processingTime,
        searchType,
        filters,
        facets,
        suggestions,
        metadata: {
          indexId,
          threshold,
          totalIndexedDocuments: mockDataService.getDocuments(indexId).length,
        },
      };

      // Publish search event
      await eventService.publishSearchQueryExecuted(query, paginatedResults, {
        searchType,
        indexId,
        filters,
        processingTime,
        totalResults: total,
      });

      logger.info('Search completed', { 
        query, 
        searchType, 
        totalResults: total, 
        processingTime 
      });

      return response;
    } catch (error) {
      logger.error('Search failed', error as Error, { query });
      throw error;
    }
  };

  const performSemanticSearch = async (query: string, options: SearchOptions): Promise<SearchResult[]> => {
    // Generate query embeddings
    const queryEmbeddings = mockDataService.generateMockEmbedding(1536);
    
    // Get documents from index
    const documents = mockDataService.getDocuments(options.indexId);
    
    // Calculate semantic similarity
    const results: SearchResult[] = documents.map(doc => {
      const similarity = mockDataService.compareEmbeddings(queryEmbeddings, doc.embeddings);
      
      return {
        id: doc.id,
        documentId: doc.documentId,
        title: doc.title,
        content: doc.content,
        metadata: doc.metadata,
        score: similarity,
        highlights: [],
        chunks: doc.chunks,
        similarity,
        relevanceScore: similarity,
        matchType: 'semantic' as const,
      };
    });

    // Filter by threshold and sort by similarity
    return results
      .filter(result => result.score >= (options.threshold || 0.7))
      .sort((a, b) => b.score - a.score);
  };

  const performKeywordSearch = async (query: string, options: SearchOptions): Promise<SearchResult[]> => {
    const queryWords = query.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    const documents = mockDataService.getDocuments(options.indexId);
    
    const results: SearchResult[] = documents.map(doc => {
      const docWords = doc.content.toLowerCase().split(/\W+/);
      const titleWords = doc.title.toLowerCase().split(/\W+/);
      const keywordWords = doc.keywords.map(k => k.toLowerCase());
      
      // Calculate keyword match score
      let score = 0;
      let matchedWords = 0;
      
      queryWords.forEach(queryWord => {
        // Title matches (higher weight)
        if (titleWords.some(titleWord => titleWord.includes(queryWord))) {
          score += 2;
          matchedWords++;
        }
        
        // Content matches
        const contentMatches = docWords.filter(docWord => docWord.includes(queryWord)).length;
        if (contentMatches > 0) {
          score += Math.min(contentMatches * 0.1, 1);
          matchedWords++;
        }
        
        // Keyword matches (medium weight)
        if (keywordWords.some(keyword => keyword.includes(queryWord))) {
          score += 1;
          matchedWords++;
        }
      });
      
      // Normalize score
      const normalizedScore = matchedWords > 0 ? score / queryWords.length : 0;
      
      return {
        id: doc.id,
        documentId: doc.documentId,
        title: doc.title,
        content: doc.content,
        metadata: doc.metadata,
        score: normalizedScore,
        highlights: [],
        chunks: doc.chunks,
        similarity: normalizedScore,
        relevanceScore: normalizedScore,
        matchType: 'keyword' as const,
      };
    });

    return results
      .filter(result => result.score >= (options.threshold || 0.1))
      .sort((a, b) => b.score - a.score);
  };

  const performHybridSearch = async (query: string, options: HybridSearchOptions): Promise<SearchResult[]> => {
    const semanticWeight = options.semanticWeight || 0.6;
    const keywordWeight = options.keywordWeight || 0.4;
    
    // Perform both searches
    const semanticResults = await performSemanticSearch(query, options);
    const keywordResults = await performKeywordSearch(query, options);
    
    // Combine results
    const combinedResults = new Map<string, SearchResult>();
    
    // Add semantic results
    semanticResults.forEach(result => {
      combinedResults.set(result.id, {
        ...result,
        score: result.score * semanticWeight,
        matchType: 'hybrid' as const,
      });
    });
    
    // Add/merge keyword results
    keywordResults.forEach(result => {
      const existing = combinedResults.get(result.id);
      if (existing) {
        existing.score += result.score * keywordWeight;
        existing.relevanceScore = (existing.relevanceScore + result.relevanceScore) / 2;
      } else {
        combinedResults.set(result.id, {
          ...result,
          score: result.score * keywordWeight,
          matchType: 'hybrid' as const,
        });
      }
    });
    
    return Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score);
  };

  const similaritySearch = async (options: SimilaritySearchOptions): Promise<SearchResult[]> => {
    const { embeddings, limit = 10, threshold = 0.7, indexId } = options;
    
    const documents = mockDataService.getDocuments(indexId);
    
    const results: SearchResult[] = documents.map(doc => {
      const similarity = mockDataService.compareEmbeddings(embeddings, doc.embeddings);
      
      return {
        id: doc.id,
        documentId: doc.documentId,
        title: doc.title,
        content: doc.content,
        metadata: options.includeMetadata ? doc.metadata : {},
        score: similarity,
        highlights: [],
        chunks: doc.chunks,
        similarity,
        relevanceScore: similarity,
        matchType: 'semantic' as const,
      };
    });

    return results
      .filter(result => result.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  };

  const multiSearch = async (queries: string[], options: SearchOptions = {}): Promise<SearchResponse[]> => {
    const results = await Promise.all(
      queries.map(query => search(query, options))
    );
    
    return results;
  };

  const searchSuggestions = async (query: string, limit: number = 5): Promise<string[]> => {
    return generateSearchSuggestions(query, limit);
  };

  const searchSimilarDocuments = async (documentId: string, limit: number = 5): Promise<SearchResult[]> => {
    const documents = mockDataService.getDocuments();
    const targetDoc = documents.find(doc => doc.documentId === documentId);
    
    if (!targetDoc) {
      throw new Error(`Document ${documentId} not found`);
    }

    return similaritySearch({
      embeddings: targetDoc.embeddings,
      limit: limit + 1, // +1 to exclude the original document
      threshold: 0.5,
    }).then(results => 
      results.filter(result => result.documentId !== documentId).slice(0, limit)
    );
  };

  const moreLikeThis = async (
    documentId: string,
    options: {
      limit?: number;
      threshold?: number;
      includeContent?: boolean;
    } = {}
  ): Promise<SearchResult[]> => {
    const { limit = 5, threshold = 0.5, includeContent = false } = options;
    
    const documents = mockDataService.getDocuments();
    const targetDoc = documents.find(doc => doc.documentId === documentId);
    
    if (!targetDoc) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Use document keywords and content for similarity
    const queryTerms = [...targetDoc.keywords, ...targetDoc.entities].join(' ');
    
    return performSemanticSearch(queryTerms, {
      limit: limit + 1,
      threshold,
      includeMetadata: true,
      includeChunks: includeContent,
    }).then(results => 
      results.filter(result => result.documentId !== documentId).slice(0, limit)
    );
  };

  // Helper functions
  const applyFilters = (results: SearchResult[], filters: SearchFilters): SearchResult[] => {
    return results.filter(result => {
      // Document type filter
      if (filters.documentTypes && filters.documentTypes.length > 0) {
        const docType = result.metadata.type || 'unknown';
        if (!filters.documentTypes.includes(docType)) {
          return false;
        }
      }

      // Language filter
      if (filters.languages && filters.languages.length > 0) {
        const language = result.metadata.language || 'unknown';
        if (!filters.languages.includes(language)) {
          return false;
        }
      }

      // Author filter
      if (filters.authors && filters.authors.length > 0) {
        const author = result.metadata.author || 'unknown';
        if (!filters.authors.includes(author)) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange) {
        const docDate = new Date(result.metadata.lastModified || result.metadata.createdAt);
        if (filters.dateRange.from && docDate < filters.dateRange.from) {
          return false;
        }
        if (filters.dateRange.to && docDate > filters.dateRange.to) {
          return false;
        }
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const docTags = result.metadata.tags || [];
        const hasMatchingTag = filters.tags.some(tag => docTags.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Word count filter
      if (filters.minWordCount && result.metadata.wordCount < filters.minWordCount) {
        return false;
      }
      if (filters.maxWordCount && result.metadata.wordCount > filters.maxWordCount) {
        return false;
      }

      return true;
    });
  };

  const applySorting = (results: SearchResult[], sort: SearchSort): SearchResult[] => {
    return results.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.field) {
        case 'relevance':
          comparison = a.score - b.score;
          break;
        case 'date':
          const dateA = new Date(a.metadata.lastModified || a.metadata.createdAt || 0);
          const dateB = new Date(b.metadata.lastModified || b.metadata.createdAt || 0);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'wordCount':
          comparison = (a.metadata.wordCount || 0) - (b.metadata.wordCount || 0);
          break;
        default:
          comparison = 0;
      }
      
      return sort.order === 'desc' ? -comparison : comparison;
    });
  };

  const generateHighlights = (content: string, query: string, options: HighlightOptions): string[] => {
    const {
      fragmentSize = 150,
      maxFragments = 3,
      preTag = '<mark>',
      postTag = '</mark>',
    } = options;

    const queryWords = query.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    const highlights: string[] = [];
    
    queryWords.forEach(queryWord => {
      const regex = new RegExp(`\\b${queryWord}\\b`, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        const index = content.toLowerCase().indexOf(queryWord);
        if (index !== -1) {
          const start = Math.max(0, index - Math.floor(fragmentSize / 2));
          const end = Math.min(content.length, start + fragmentSize);
          let fragment = content.substring(start, end);
          
          // Highlight the matching word
          fragment = fragment.replace(regex, `${preTag}$&${postTag}`);
          
          // Add ellipsis if needed
          if (start > 0) fragment = '...' + fragment;
          if (end < content.length) fragment = fragment + '...';
          
          highlights.push(fragment);
        }
      }
    });

    return highlights.slice(0, maxFragments);
  };

  const generateFacets = (results: SearchResult[]): SearchFacets => {
    const facets: SearchFacets = {};
    
    // Document types
    const typeCount = new Map<string, number>();
    results.forEach(result => {
      const type = result.metadata.type || 'unknown';
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });
    facets.documentTypes = Array.from(typeCount.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    // Languages
    const languageCount = new Map<string, number>();
    results.forEach(result => {
      const language = result.metadata.language || 'unknown';
      languageCount.set(language, (languageCount.get(language) || 0) + 1);
    });
    facets.languages = Array.from(languageCount.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    // Authors
    const authorCount = new Map<string, number>();
    results.forEach(result => {
      const author = result.metadata.author || 'unknown';
      authorCount.set(author, (authorCount.get(author) || 0) + 1);
    });
    facets.authors = Array.from(authorCount.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    return facets;
  };

  const generateSearchSuggestions = async (query: string, limit: number = 5): Promise<string[]> => {
    // Mock suggestions based on popular queries and query expansion
    const popularQueries = mockDataService.getStatistics().popularQueries;
    const suggestions: string[] = [];
    
    // Add partial matches from popular queries
    popularQueries.forEach(popular => {
      if (popular.toLowerCase().includes(query.toLowerCase()) && popular !== query) {
        suggestions.push(popular);
      }
    });

    // Add query expansions
    const queryWords = query.split(' ');
    if (queryWords.length > 0) {
      const expansions = [
        `${query} tutorial`,
        `${query} guide`,
        `${query} documentation`,
        `${query} examples`,
        `${query} best practices`,
      ];
      suggestions.push(...expansions);
    }

    return suggestions.slice(0, limit);
  };

  return {
    search,
    similaritySearch,
    multiSearch,
    searchSuggestions,
    searchSimilarDocuments,
    moreLikeThis,
    
    // Analytics methods
    getSearchStats: () => {
      const stats = mockDataService.getStatistics();
      return {
        totalQueries: stats.queryCount,
        averageQueryTime: stats.averageQueryTime,
        popularQueries: stats.popularQueries,
        successRate: stats.successRate,
      };
    },
    
    // Utility methods
    validateQuery: (query: string) => {
      if (!query || query.trim().length === 0) {
        throw new Error('Query cannot be empty');
      }
      if (query.length > 1000) {
        throw new Error('Query too long (max 1000 characters)');
      }
      return true;
    },
    
    explainQuery: (query: string, options: SearchOptions = {}) => {
      // Mock query explanation
      return {
        query,
        queryType: options.searchType || 'semantic',
        analyzedTerms: query.split(/\W+/).filter(word => word.length > 2),
        estimatedResults: Math.floor(Math.random() * 100) + 10,
        processingSteps: [
          'Query analysis',
          'Embedding generation',
          'Similarity calculation',
          'Filtering',
          'Ranking',
          'Result formatting',
        ],
      };
    },
  };
}