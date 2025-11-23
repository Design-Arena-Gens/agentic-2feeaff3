import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=FR&maxResults=20&key=${apiKey}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to fetch trending videos' },
        { status: response.status }
      );
    }

    const data = await response.json();

    const videos = data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channel: item.snippet.channelTitle,
      views: formatViews(item.statistics.viewCount),
      duration: formatDuration(item.contentDetails.duration),
      url: `https://www.youtube.com/watch?v=${item.id}`,
      status: 'pending'
    }));

    return NextResponse.json({ videos });
  } catch (error: any) {
    console.error('Error fetching trending videos:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatViews(views: string): string {
  const num = parseInt(views);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M vues`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K vues`;
  }
  return `${num} vues`;
}

function formatDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
