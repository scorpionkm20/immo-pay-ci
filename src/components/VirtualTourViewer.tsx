import { useEffect, useRef } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { VideoPlugin } from '@photo-sphere-viewer/video-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/video-plugin/index.css';

interface VirtualTourViewerProps {
  mediaUrl: string;
  type: 'video' | 'photo_360';
  title: string;
}

export const VirtualTourViewer = ({ mediaUrl, type, title }: VirtualTourViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (!viewerRef.current) return;

    // Cleanup previous viewer
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.destroy();
    }

    try {
      if (type === 'photo_360') {
        // Initialize photo sphere viewer
        viewerInstanceRef.current = new Viewer({
          container: viewerRef.current,
          panorama: mediaUrl,
          caption: title,
          loadingImg: '/placeholder.svg',
          navbar: [
            'zoom',
            'move',
            'fullscreen',
          ],
          defaultZoomLvl: 50,
          mousewheel: true,
          mousemove: true,
          touchmoveTwoFingers: true,
        });
      } else if (type === 'video') {
        // Initialize video sphere viewer
        viewerInstanceRef.current = new Viewer({
          container: viewerRef.current,
          plugins: [
            [VideoPlugin, {
              progressbar: true,
              bigplayButton: true,
            }],
          ],
          caption: title,
          navbar: [
            'zoom',
            'move',
            'video',
            'fullscreen',
          ],
          defaultZoomLvl: 50,
          mousewheel: true,
          mousemove: true,
        });

        const videoPlugin = viewerInstanceRef.current.getPlugin(VideoPlugin) as any;
        if (videoPlugin && videoPlugin.setVideo) {
          videoPlugin.setVideo({
            source: mediaUrl,
          });
        }
      }
    } catch (error) {
      console.error('Error initializing viewer:', error);
    }

    return () => {
      if (viewerInstanceRef.current) {
        viewerInstanceRef.current.destroy();
        viewerInstanceRef.current = null;
      }
    };
  }, [mediaUrl, type, title]);

  return (
    <div 
      ref={viewerRef} 
      className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg"
      style={{ backgroundColor: '#000' }}
    />
  );
};
