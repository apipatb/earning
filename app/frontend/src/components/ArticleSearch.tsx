import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  ThumbUp as ThumbUpIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useKnowledgeStore } from '../store/knowledgeStore';
import SearchHighlight from './SearchHighlight';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  views: number;
  helpfulYes: number;
  helpfulNo: number;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const ArticleSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    searchQuery,
    setSearchQuery,
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    categories,
    setCategories,
  } = useKnowledgeStore();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Load categories and tags
    fetchCategoriesAndTags();

    // Get query from URL
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, []);

  const fetchCategoriesAndTags = async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        axios.get(`${API_URL}/knowledge/categories`),
        axios.get(`${API_URL}/knowledge/tags`),
      ]);

      setCategories(categoriesRes.data.data);
      setAllTags(tagsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch categories and tags:', err);
    }
  };

  const performSearch = async (query: string, categoryId?: string, searchTags?: string[]) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/knowledge/search`, {
        query,
        categoryId: categoryId || undefined,
        tags: searchTags && searchTags.length > 0 ? searchTags : undefined,
        limit: 20,
      });

      setResults(response.data.data);
      setTotal(response.data.total);
      addSearchHistory(query);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSearchParams({ q: query });
    performSearch(query, selectedCategory, tags);
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    const categoryId = event.target.value;
    setSelectedCategory(categoryId);
    performSearch(searchQuery, categoryId, tags);
  };

  const handleTagsChange = (event: any, newTags: string[]) => {
    setTags(newTags);
    performSearch(searchQuery, selectedCategory, newTags);
  };

  const handleArticleClick = (slug: string) => {
    navigate(`/knowledge/article/${slug}`);
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    setSearchParams({ q: query });
    performSearch(query, selectedCategory, tags);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Search Header */}
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Search Knowledge Base
      </Typography>

      {/* Search Input */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search for articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch(searchQuery);
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          variant="outlined"
          sx={{ mb: 2 }}
        />

        {/* Filters */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={handleCategoryChange}
              label="Category"
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            multiple
            fullWidth
            options={allTags}
            value={tags}
            onChange={handleTagsChange}
            renderInput={(params) => (
              <TextField {...params} label="Tags" placeholder="Filter by tags" />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  size="small"
                  color="primary"
                />
              ))
            }
          />
        </Stack>
      </Paper>

      {/* Search History */}
      {!searchQuery && searchHistory.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <HistoryIcon color="action" />
              <Typography variant="subtitle1" fontWeight="bold">
                Recent Searches
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              color="primary"
              sx={{ cursor: 'pointer' }}
              onClick={clearSearchHistory}
            >
              Clear History
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {searchHistory.slice(0, 10).map((item, index) => (
              <Chip
                key={index}
                label={item.query}
                onClick={() => handleHistoryClick(item.query)}
                variant="outlined"
                size="small"
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Search Results */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && searchQuery && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Found {total} {total === 1 ? 'result' : 'results'} for "{searchQuery}"
          </Typography>
        </Box>
      )}

      {!loading && results.length > 0 && (
        <Paper>
          <List>
            {results.map((result, index) => (
              <React.Fragment key={result.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleArticleClick(result.slug)}
                    sx={{ py: 2 }}
                  >
                    <ListItemText
                      primary={
                        <SearchHighlight text={result.title} query={searchQuery} />
                      }
                      secondary={
                        <Box>
                          {result.excerpt && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1 }}
                            >
                              <SearchHighlight
                                text={result.excerpt}
                                query={searchQuery}
                              />
                            </Typography>
                          )}
                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            sx={{ mt: 1 }}
                          >
                            {result.category && (
                              <Chip
                                label={result.category.name}
                                size="small"
                                color="primary"
                              />
                            )}
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.5}
                              sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
                            >
                              <VisibilityIcon fontSize="small" />
                              <span>{result.views}</span>
                            </Stack>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.5}
                              sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
                            >
                              <ThumbUpIcon fontSize="small" />
                              <span>{result.helpfulYes}</span>
                            </Stack>
                          </Stack>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                {index < results.length - 1 && <Box sx={{ px: 2 }}><Box sx={{ borderBottom: 1, borderColor: 'divider' }} /></Box>}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {!loading && searchQuery && results.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No results found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search terms or filters
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default ArticleSearch;
