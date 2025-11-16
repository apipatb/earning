import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  Rating,
  TextField,
  Stack,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/auth.store';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface Feedback {
  isHelpful: boolean;
  rating?: number;
  comment?: string;
}

interface ArticleFeedbackProps {
  articleId: string;
  initialFeedback?: Feedback;
}

const ArticleFeedback: React.FC<ArticleFeedbackProps> = ({
  articleId,
  initialFeedback,
}) => {
  const { token } = useAuthStore();

  const [isHelpful, setIsHelpful] = useState<boolean | null>(
    initialFeedback?.isHelpful ?? null
  );
  const [rating, setRating] = useState<number | null>(
    initialFeedback?.rating ?? null
  );
  const [comment, setComment] = useState(initialFeedback?.comment || '');
  const [showCommentField, setShowCommentField] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialFeedback) {
      setIsHelpful(initialFeedback.isHelpful);
      setRating(initialFeedback.rating ?? null);
      setComment(initialFeedback.comment || '');
      if (initialFeedback.comment) {
        setShowCommentField(true);
      }
    }
  }, [initialFeedback]);

  const handleHelpfulClick = async (helpful: boolean) => {
    setIsHelpful(helpful);
    setShowCommentField(true);

    // Submit feedback immediately
    await submitFeedback(helpful, rating, comment);
  };

  const handleSubmitComment = async () => {
    if (isHelpful === null) {
      setError('Please indicate if this article was helpful');
      return;
    }

    await submitFeedback(isHelpful, rating, comment);
  };

  const submitFeedback = async (
    helpful: boolean,
    feedbackRating: number | null,
    feedbackComment: string
  ) => {
    if (!token) {
      setError('You must be logged in to submit feedback');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: any = {
        isHelpful: helpful,
      };

      if (feedbackRating) {
        payload.rating = feedbackRating;
      }

      if (feedbackComment.trim()) {
        payload.comment = feedbackComment;
      }

      await axios.post(
        `${API_URL}/knowledge/articles/${articleId}/feedback`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess(true);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom fontWeight="bold">
        Was this article helpful?
      </Typography>

      <Stack spacing={3}>
        {/* Helpful Buttons */}
        <Box>
          <ButtonGroup variant={isHelpful === null ? 'outlined' : 'contained'}>
            <Button
              startIcon={<ThumbUpIcon />}
              onClick={() => handleHelpfulClick(true)}
              color={isHelpful === true ? 'success' : 'inherit'}
              disabled={submitting}
            >
              Yes
            </Button>
            <Button
              startIcon={<ThumbDownIcon />}
              onClick={() => handleHelpfulClick(false)}
              color={isHelpful === false ? 'error' : 'inherit'}
              disabled={submitting}
            >
              No
            </Button>
          </ButtonGroup>
        </Box>

        {/* Rating and Comment */}
        {showCommentField && (
          <>
            <Divider />

            <Box>
              <Typography variant="body2" gutterBottom>
                Rate this article (optional)
              </Typography>
              <Rating
                value={rating}
                onChange={(event, newValue) => setRating(newValue)}
                size="large"
                disabled={submitting}
              />
            </Box>

            <Box>
              <Typography variant="body2" gutterBottom>
                Additional comments (optional)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Tell us more about your experience with this article..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={submitting}
                variant="outlined"
              />
            </Box>

            <Box>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleSubmitComment}
                disabled={submitting || isHelpful === null}
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </Box>
          </>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Stack>

      {/* Success Snackbar */}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Thank you for your feedback!
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default ArticleFeedback;
