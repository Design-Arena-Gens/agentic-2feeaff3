'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  views: string;
  duration: string;
  url: string;
  status?: 'pending' | 'downloading' | 'uploading' | 'completed' | 'error';
}

interface TransferLog {
  id: string;
  videoTitle: string;
  timestamp: Date;
  status: string;
  message: string;
}

export default function Home() {
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([]);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [tiktokAccessToken, setTiktokAccessToken] = useState('');
  const [autoTransfer, setAutoTransfer] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchTrendingVideos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/youtube/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: youtubeApiKey })
      });
      const data = await response.json();
      if (data.videos) {
        setTrendingVideos(data.videos);
      }
    } catch (error) {
      console.error('Error fetching trending videos:', error);
      addLog('error', 'Erreur lors de la récupération des vidéos tendance', 'Erreur API');
    }
    setLoading(false);
  };

  const transferVideo = async (video: Video) => {
    try {
      updateVideoStatus(video.id, 'downloading');
      addLog('downloading', `Téléchargement de "${video.title}"`, video.title);

      const downloadResponse = await fetch('/api/youtube/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: video.url })
      });

      const downloadData = await downloadResponse.json();

      if (downloadData.error) {
        throw new Error(downloadData.error);
      }

      updateVideoStatus(video.id, 'uploading');
      addLog('uploading', `Upload vers TikTok de "${video.title}"`, video.title);

      const uploadResponse = await fetch('/api/tiktok/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoData: downloadData.videoInfo,
          accessToken: tiktokAccessToken
        })
      });

      const uploadData = await uploadResponse.json();

      if (uploadData.success) {
        updateVideoStatus(video.id, 'completed');
        addLog('completed', `Vidéo transférée avec succès sur TikTok`, video.title);
      } else {
        throw new Error(uploadData.error || 'Upload failed');
      }
    } catch (error: any) {
      updateVideoStatus(video.id, 'error');
      addLog('error', error.message || 'Erreur lors du transfert', video.title);
    }
  };

  const updateVideoStatus = (videoId: string, status: Video['status']) => {
    setTrendingVideos(prev =>
      prev.map(v => v.id === videoId ? { ...v, status } : v)
    );
  };

  const addLog = (status: string, message: string, videoTitle: string) => {
    const newLog: TransferLog = {
      id: Date.now().toString(),
      videoTitle,
      timestamp: new Date(),
      status,
      message
    };
    setTransferLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const startAgent = () => {
    setIsAgentRunning(true);
    setAutoTransfer(true);
    addLog('info', 'Agent démarré - surveillance des tendances YouTube', 'Système');
  };

  const stopAgent = () => {
    setIsAgentRunning(false);
    setAutoTransfer(false);
    addLog('info', 'Agent arrêté', 'Système');
  };

  useEffect(() => {
    if (autoTransfer && trendingVideos.length > 0) {
      const videosToTransfer = trendingVideos.filter(v => !v.status || v.status === 'pending');
      if (videosToTransfer.length > 0) {
        transferVideo(videosToTransfer[0]);
      }
    }
  }, [autoTransfer, trendingVideos]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎬 Agent YouTube → TikTok
          </h1>
          <p className="text-xl text-gray-300">
            Trouvez les vidéos tendances sur YouTube et transférez-les automatiquement sur TikTok
          </p>
        </header>

        {/* Configuration Panel */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">⚙️ Configuration</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white mb-2">Clé API YouTube</label>
              <input
                type="text"
                value={youtubeApiKey}
                onChange={(e) => setYoutubeApiKey(e.target.value)}
                placeholder="Entrez votre clé API YouTube"
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-white mb-2">Token TikTok</label>
              <input
                type="text"
                value={tiktokAccessToken}
                onChange={(e) => setTiktokAccessToken(e.target.value)}
                placeholder="Entrez votre token TikTok"
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={fetchTrendingVideos}
              disabled={loading || !youtubeApiKey}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
            >
              {loading ? '🔄 Chargement...' : '🔍 Chercher les tendances'}
            </button>
            {!isAgentRunning ? (
              <button
                onClick={startAgent}
                disabled={!youtubeApiKey || !tiktokAccessToken || trendingVideos.length === 0}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
              >
                ▶️ Démarrer l'agent
              </button>
            ) : (
              <button
                onClick={stopAgent}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold transition-all"
              >
                ⏸️ Arrêter l'agent
              </button>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        {isAgentRunning && (
          <div className="bg-green-500/20 backdrop-blur-md rounded-lg p-4 mb-8 border border-green-500/50 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-white font-semibold">Agent actif - Transfert automatique en cours</span>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Trending Videos */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">📈 Vidéos Tendances YouTube</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {trendingVideos.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Aucune vidéo chargée. Cliquez sur "Chercher les tendances" pour commencer.
                </p>
              ) : (
                trendingVideos.map((video) => (
                  <div key={video.id} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all">
                    <div className="flex gap-4">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-32 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1 line-clamp-2">{video.title}</h3>
                        <p className="text-gray-400 text-sm mb-2">{video.channel}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>👁️ {video.views}</span>
                          <span>⏱️ {video.duration}</span>
                        </div>
                        {video.status && (
                          <div className="mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              video.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                              video.status === 'error' ? 'bg-red-500/20 text-red-300' :
                              video.status === 'downloading' || video.status === 'uploading' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {video.status === 'completed' ? '✓ Transféré' :
                               video.status === 'error' ? '✗ Erreur' :
                               video.status === 'downloading' ? '⬇️ Téléchargement...' :
                               video.status === 'uploading' ? '⬆️ Upload...' :
                               '⏳ En attente'}
                            </span>
                          </div>
                        )}
                      </div>
                      {!video.status && (
                        <button
                          onClick={() => transferVideo(video)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold h-fit"
                        >
                          Transférer
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Transfer Logs */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">📋 Journal de Transfert</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {transferLogs.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Aucune activité pour le moment.
                </p>
              ) : (
                transferLogs.map((log) => (
                  <div key={log.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        log.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                        log.status === 'error' ? 'bg-red-500/20 text-red-300' :
                        log.status === 'downloading' || log.status === 'uploading' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {log.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(log.timestamp, 'HH:mm:ss', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-white text-sm font-medium">{log.videoTitle}</p>
                    <p className="text-gray-400 text-xs mt-1">{log.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-400">
          <p className="text-sm">
            Agent automatique de transfert YouTube vers TikTok - Trouvez et partagez les tendances
          </p>
        </footer>
      </div>
    </div>
  );
}
