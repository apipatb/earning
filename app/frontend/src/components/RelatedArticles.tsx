import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Stack,
  Skeleton,
  Divider,
} from '@mui/material';
import {
  Article as ArticleIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  views: number;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface RelatedArticlesProps {
  articleId: string;
  limit?: number;
}

const RelatedArticles: React.FC<RelatedArticlesProps> = ({
  articleId,
  limit = 5,
}) => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRelatedArticles();
  }, [articleId]);

  const fetchRelatedArticles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `${API_URL}/knowledge/articles/${articleId}/related?limit=${limit}`
      );

      setArticles(response.data.data);
    } catch (err) {
      console.error('Failed to fetch related articles:', err);
      setError('Failed to load related articles');
    } finally {
      setLoading(false);
    }
  };

  const handleArticleClick = (slug: string) => {
    navigate(`/knowledge/article/${slug}`);
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Related Articles
        </Typography>
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={60} />
          ))}
        </Stack>
      </Paper>
    );
  }

  if (error || articles.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <ArticleIcon color="primary" />
        <Typography variant="h6" fontWeight="bold">
          Related Articles
        </Typography>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <List disablePadding>
        {articles.map((article, index) => (
          <React.Fragment key={article.id}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleArticleClick(article.slug)}
                sx={{
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight="medium">
                      {article.title}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      {article.excerpt && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {article.excerpt}
                        </Typography>
                      )}
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mt: 1 }}
                      >
                        {article.category && (
                          <Chip
                            label={article.category.name}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.5}
                          sx={{ fontSize: '0.875rem', color: 'text.secondary' }}
                        >
                          <VisibilityIcon fontSize="small" />
                          <span>{article.views} views</span>
                        </Stack>
                      </Stack>
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
            {index < articles.length - 1 && (
              <Divider sx={{ my: 1 }} />
            )}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default RelatedArticles;
