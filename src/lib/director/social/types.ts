// Shared social-platform data shape (client mirror of the server's SocialData).
// TikTok fills it today; Instagram/Facebook/YouTube fill the same shape later, so
// all the intelligence + UI below is platform-agnostic.
export interface SocialVideo {
  id: string;
  caption: string;
  hashtags: string[];
  createdAt: number;
  durationSec: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  favorites: number;
}
export interface SocialData {
  platform: string;
  account: { username: string; displayName: string; followers: number; totalLikes: number };
  totals: { views: number; likes: number; comments: number; shares: number; favorites: number };
  videos: SocialVideo[];
  range: { start: number; end: number };
  unavailable: string[];
}
export interface SocialVocab { cities: string[]; services: string[] }

export const engagementRate = (v: SocialVideo): number =>
  v.views > 0 ? (v.likes + v.comments + v.shares) / v.views : 0;
