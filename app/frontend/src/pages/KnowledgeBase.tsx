import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Paper,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Book as BookIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  ThumbUp as ThumbUpIcon,
} from '@mui/icons-material';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { useAuthStore } from '../store/auth.store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  slug: string;
  articleCount: number;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  views: number;
  helpfulYes: number;
  helpfulNo: number;
  publishedAt?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

const KnowledgeBase: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const {
    categories,
    setCategories,
    searchQuery,
    setSearchQuery,
    addSearchHistory,
  } = useKnowledgeStore();

  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories, popular articles, and recent articles
      const [categoriesRes, popularRes, recentRes] = await Promise.all([
        axios.get(`${API_URL}/knowledge/categories`),
        axios.get(`${API_URL}/knowledge/popular?limit=6`),
        axios.get(`${API_URL}/knowledge/recent?limit=6`),
      ]);

      setCategories(categoriesRes.data.data);
      setPopularArticles(popularRes.data.data);
      setRecentArticles(recentRes.data.data);
    } catch (err) {
      console.error('Failed to fetch knowledge base data:', err);
      setError('Failed to load knowledge base. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      addSearchHistory(query);
      navigate(`/knowledge/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleCategoryClick = (categorySlug: string) => {
    navigate(`/knowledge/category/${categorySlug}`);
  };

  const handleArticleClick = (articleSlug: string) => {
    navigate(`/knowledge/article/${articleSlug}`);
  };

  const getCategoryIcon = (icon?: string) => {
    if (icon) {
      // Check if it's an emoji
      if (/\p{Emoji}/u.test(icon)) {
        return <span style={{ fontSize: '2rem' }}>{icon}</span>;
      }
    }
    return <BookIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Knowledge Base
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Find answers to your questions about EarnTrack
        </Typography>

        {/* Search Bar */}
        <Paper sx={{ p: 1, maxWidth: 600, mx: 'auto' }}>
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
          />
        </Paper>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Categories */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
          Browse by Category
        </Typography>

        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rectangular" height={200} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {categories.map((category) => (
              <Grid item xs={12} sm={6} md={3} key={category.id}>
                <Card
                  elevation={2}
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => handleCategoryClick(category.slug)}
                    sx={{ height: '100%', p: 2 }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Box sx={{ mb: 2 }}>
                        {getCategoryIcon(category.icon)}
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {category.name}
                      </Typography>
                      {category.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {category.description}
                        </Typography>
                      )}
                      <Chip
                        label={`${category.articleCount} articles`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Popular Articles */}
      <Box sx={{ mb: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <TrendingUpIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">
            Popular Articles
          </Typography>
        </Stack>

        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} md={4} key={i}>
                <Skeleton variant="rectangular" height={150} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {popularArticles.map((article) => (
              <Grid item xs={12} md={4} key={article.id}>
                <Card
                  elevation={1}
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => handleArticleClick(article.slug)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      {article.category && (
                        <Chip
                          label={article.category.name}
                          size="small"
                          color="primary"
                          sx={{ mb: 1 }}
                        />
                      )}
                      <Typography variant="h6" gutterBottom>
                        {article.title}
                      </Typography>
                      {article.excerpt && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {article.excerpt}
                        </Typography>
                      )}
                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <VisibilityIcon fontSize="small" />
                          <span>{article.views}</span>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <ThumbUpIcon fontSize="small" />
                          <span>{article.helpfulYes}</span>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Recent Articles */}
      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <ScheduleIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">
            Recently Added
          </Typography>
        </Stack>

        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} md={4} key={i}>
                <Skeleton variant="rectangular" height={150} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {recentArticles.map((article) => (
              <Grid item xs={12} md={4} key={article.id}>
                <Card
                  elevation={1}
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => handleArticleClick(article.slug)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      {article.category && (
                        <Chip
                          label={article.category.name}
                          size="small"
                          color="secondary"
                          sx={{ mb: 1 }}
                        />
                      )}
                      <Typography variant="h6" gutterBottom>
                        {article.title}
                      </Typography>
                      {article.excerpt && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {article.excerpt}
                        </Typography>
                      )}
                      {article.publishedAt && (
                        <Typography variant="caption" color="text.secondary">
                          {new Date(article.publishedAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default KnowledgeBase;
