import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  slug: string;
  displayOrder: number;
  articleCount: number;
}

interface Article {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author?: string;
  views: number;
  helpfulYes: number;
  helpfulNo: number;
  tags: string[];
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  userFeedback?: {
    isHelpful: boolean;
    rating?: number;
    comment?: string;
  };
}

interface SearchHistory {
  query: string;
  timestamp: number;
}

interface KnowledgeStore {
  categories: Category[];
  articles: Article[];
  currentArticle: Article | null;
  searchQuery: string;
  searchResults: Article[];
  searchHistory: SearchHistory[];
  viewedArticles: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCategories: (categories: Category[]) => void;
  setArticles: (articles: Article[]) => void;
  setCurrentArticle: (article: Article | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Article[]) => void;
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  addViewedArticle: (articleId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const MAX_SEARCH_HISTORY = 10;
const MAX_VIEWED_ARTICLES = 20;

export const useKnowledgeStore = create<KnowledgeStore>()(
  persist(
    (set) => ({
      categories: [],
      articles: [],
      currentArticle: null,
      searchQuery: '',
      searchResults: [],
      searchHistory: [],
      viewedArticles: [],
      isLoading: false,
      error: null,

      setCategories: (categories) => set({ categories }),

      setArticles: (articles) => set({ articles }),

      setCurrentArticle: (article) => set({ currentArticle: article }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSearchResults: (results) => set({ searchResults: results }),

      addSearchHistory: (query) =>
        set((state) => {
          // Check if query already exists
          const existingIndex = state.searchHistory.findIndex(
            (item) => item.query.toLowerCase() === query.toLowerCase()
          );

          let newHistory = [...state.searchHistory];

          if (existingIndex !== -1) {
            // Remove existing entry
            newHistory.splice(existingIndex, 1);
          }

          // Add new entry at the beginning
          newHistory.unshift({ query, timestamp: Date.now() });

          // Keep only MAX_SEARCH_HISTORY items
          if (newHistory.length > MAX_SEARCH_HISTORY) {
            newHistory = newHistory.slice(0, MAX_SEARCH_HISTORY);
          }

          return { searchHistory: newHistory };
        }),

      clearSearchHistory: () => set({ searchHistory: [] }),

      addViewedArticle: (articleId) =>
        set((state) => {
          // Check if article already exists
          const existingIndex = state.viewedArticles.indexOf(articleId);

          let newViewedArticles = [...state.viewedArticles];

          if (existingIndex !== -1) {
            // Remove existing entry
            newViewedArticles.splice(existingIndex, 1);
          }

          // Add new entry at the beginning
          newViewedArticles.unshift(articleId);

          // Keep only MAX_VIEWED_ARTICLES items
          if (newViewedArticles.length > MAX_VIEWED_ARTICLES) {
            newViewedArticles = newViewedArticles.slice(0, MAX_VIEWED_ARTICLES);
          }

          return { viewedArticles: newViewedArticles };
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      reset: () =>
        set({
          categories: [],
          articles: [],
          currentArticle: null,
          searchQuery: '',
          searchResults: [],
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'knowledge-storage',
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        viewedArticles: state.viewedArticles,
      }),
    }
  )
);
