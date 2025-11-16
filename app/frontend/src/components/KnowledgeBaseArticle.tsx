import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Breadcrumbs,
  Link,
  Chip,
  Stack,
  Divider,
  Skeleton,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Card,
  CardContent,
} from '@mui/material';
import {
  Home as HomeIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { useAuthStore } from '../store/auth.store';
import ArticleFeedback from './ArticleFeedback';
import RelatedArticles from './RelatedArticles';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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
  publishedAt?: string;
  createdAt: string;
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

interface TocItem {
  id: string;
  level: number;
  text: string;
}

const KnowledgeBaseArticle: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { addViewedArticle, setCurrentArticle } = useKnowledgeStore();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  useEffect(() => {
    if (article && contentRef.current) {
      // Generate table of contents from headings
      const headings = contentRef.current.querySelectorAll('h2, h3, h4');
      const tocItems: TocItem[] = [];

      headings.forEach((heading, index) => {
        const id = `heading-${index}`;
        heading.id = id;

        tocItems.push({
          id,
          level: parseInt(heading.tagName.charAt(1)),
          text: heading.textContent || '',
        });
      });

      setToc(tocItems);

      // Set up intersection observer for active section highlighting
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(entry.target.id);
            }
          });
        },
        {
          rootMargin: '-100px 0px -80% 0px',
        }
      );

      headings.forEach((heading) => {
        observer.observe(heading);
      });

      return () => {
        headings.forEach((heading) => {
          observer.unobserve(heading);
        });
      };
    }
  }, [article]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/knowledge/articles/${slug}`);
      const articleData = response.data.data;

      setArticle(articleData);
      setCurrentArticle(articleData);
      addViewedArticle(articleData.id);

      // Track view
      if (token) {
        axios.post(
          `${API_URL}/knowledge/articles/${articleData.id}/view`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ).catch(console.error);
      }
    } catch (err) {
      console.error('Failed to fetch article:', err);
      setError('Failed to load article. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const convertMarkdownToHtml = (markdown: string): string => {
    const rawHtml = marked(markdown);
    return DOMPurify.sanitize(rawHtml);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width="60%" height={60} />
        <Skeleton variant="text" width="40%" height={30} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  if (error || !article) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Article not found'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 3 }}
      >
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/knowledge')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
          Knowledge Base
        </Link>
        {article.category && (
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate(`/knowledge/category/${article.category?.slug}`)}
            sx={{ cursor: 'pointer' }}
          >
            {article.category.name}
          </Link>
        )}
        <Typography color="text.primary">{article.title}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', gap: 4 }}>
        {/* Main Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Article Header */}
          <Paper sx={{ p: 4, mb: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
              {article.title}
            </Typography>

            {article.excerpt && (
              <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                {article.excerpt}
              </Typography>
            )}

            {/* Metadata */}
            <Stack
              direction="row"
              spacing={2}
              sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
            >
              {article.author && (
                <Chip
                  icon={<PersonIcon />}
                  label={article.author}
                  size="small"
                  variant="outlined"
                />
              )}
              <Chip
                icon={<VisibilityIcon />}
                label={`${article.views} views`}
                size="small"
                variant="outlined"
              />
              {article.publishedAt && (
                <Chip
                  icon={<ScheduleIcon />}
                  label={new Date(article.publishedAt).toLocaleDateString()}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {article.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" color="primary" />
                ))}
              </Stack>
            )}
          </Paper>

          {/* Article Content */}
          <Paper sx={{ p: 4, mb: 4 }}>
            <Box
              ref={contentRef}
              className="markdown-content"
              dangerouslySetInnerHTML={{
                __html: convertMarkdownToHtml(article.content),
              }}
              sx={{
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  mt: 3,
                  mb: 2,
                  fontWeight: 'bold',
                },
                '& h2': {
                  fontSize: '1.75rem',
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  pb: 1,
                },
                '& h3': {
                  fontSize: '1.5rem',
                },
                '& h4': {
                  fontSize: '1.25rem',
                },
                '& p': {
                  mb: 2,
                  lineHeight: 1.7,
                },
                '& ul, & ol': {
                  mb: 2,
                  pl: 4,
                },
                '& li': {
                  mb: 1,
                },
                '& code': {
                  backgroundColor: 'action.hover',
                  padding: '2px 6px',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                },
                '& pre': {
                  backgroundColor: 'action.hover',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  mb: 2,
                },
                '& pre code': {
                  backgroundColor: 'transparent',
                  padding: 0,
                },
                '& img': {
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: 1,
                  my: 2,
                },
                '& blockquote': {
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                  pl: 2,
                  ml: 0,
                  fontStyle: 'italic',
                  color: 'text.secondary',
                },
                '& table': {
                  width: '100%',
                  borderCollapse: 'collapse',
                  mb: 2,
                },
                '& th, & td': {
                  border: '1px solid',
                  borderColor: 'divider',
                  p: 1,
                  textAlign: 'left',
                },
                '& th': {
                  backgroundColor: 'action.hover',
                  fontWeight: 'bold',
                },
              }}
            />
          </Paper>

          {/* Feedback */}
          {token && (
            <ArticleFeedback
              articleId={article.id}
              initialFeedback={article.userFeedback}
            />
          )}

          {/* Related Articles */}
          <RelatedArticles articleId={article.id} />
        </Box>

        {/* Table of Contents Sidebar */}
        {toc.length > 0 && (
          <Box
            sx={{
              width: 280,
              display: { xs: 'none', lg: 'block' },
              position: 'sticky',
              top: 80,
              alignSelf: 'flex-start',
            }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Table of Contents
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List dense>
                  {toc.map((item) => (
                    <ListItem key={item.id} disablePadding>
                      <ListItemButton
                        onClick={() => scrollToSection(item.id)}
                        selected={activeSection === item.id}
                        sx={{
                          pl: (item.level - 2) * 2,
                          py: 0.5,
                        }}
                      >
                        <ListItemText
                          primary={item.text}
                          primaryTypographyProps={{
                            variant: 'body2',
                            fontWeight: activeSection === item.id ? 'bold' : 'normal',
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default KnowledgeBaseArticle;
