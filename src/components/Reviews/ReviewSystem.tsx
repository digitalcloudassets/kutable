import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ReviewSystemProps {
  barberId: string;
  bookingId?: string;
  onReviewSubmitted: () => void;
}

const ReviewSystem: React.FC<ReviewSystemProps> = ({ 
  barberId, 
  bookingId, 
  onReviewSubmitted 
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rating === 0) return;

    setSubmitting(true);
    try {
      // Get or create client profile
      let clientProfile;
      const { data: existingProfile } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        clientProfile = existingProfile;
      } else {
        const { data: newProfile, error: profileError } = await supabase
          .from('client_profiles')
          .insert({
            user_id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            email: user.email || ''
          })
          .select('id')
          .single();

        if (profileError) throw profileError;
        clientProfile = newProfile;
      }

      // Submit review
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          barber_id: barberId,
          client_id: clientProfile.id,
          booking_id: bookingId || null,
          rating,
          comment: comment.trim() || null
        });

      if (reviewError) throw reviewError;

      // Update barber's average rating
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('barber_id', barberId);

      if (reviews) {
        const totalRatings = reviews.length;
        const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

        await supabase
          .from('barber_profiles')
          .update({
            average_rating: averageRating,
            total_reviews: totalRatings
          })
          .eq('id', barberId);
      }

      // Reset form
      setRating(0);
      setComment('');
      onReviewSubmitted();

    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600 mb-4">Sign in to leave a review</p>
        <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave a Review</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Rating
          </label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-colors"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Review (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Tell others about your experience..."
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={rating === 0 || submitting}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>{submitting ? 'Submitting...' : 'Submit Review'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewSystem;