import { Chapter, PlotPoint } from '../types';
import { TrendingUp } from 'lucide-react';
import './StoryArcView.css';

interface StoryArcViewProps {
  chapters: Chapter[];
  plotPoints: PlotPoint[];
}

function StoryArcView({ chapters, plotPoints }: StoryArcViewProps) {
  if (chapters.length === 0) {
    return (
      <div className="story-arc-empty">
        <TrendingUp size={48} />
        <p>Add chapters to visualize your story arc</p>
      </div>
    );
  }

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
  const totalWords = sortedChapters.reduce(
    (sum, ch) => sum + ch.content.split(/\s+/).filter(w => w.length > 0).length,
    0
  );

  // Plot point categories with colors
  const categoryColors = {
    setup: '#5856d6',
    conflict: '#ff9500',
    climax: '#ff3b30',
    resolution: '#34c759',
    other: '#888',
  };

  return (
    <div className="story-arc-view">
      <div className="arc-header">
        <h3>Story Arc</h3>
        <div className="arc-stats">
          <div className="stat">
            <span className="stat-value">{chapters.length}</span>
            <span className="stat-label">Chapters</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalWords.toLocaleString()}</span>
            <span className="stat-label">Words</span>
          </div>
          <div className="stat">
            <span className="stat-value">{plotPoints.length}</span>
            <span className="stat-label">Plot Points</span>
          </div>
        </div>
      </div>

      <div className="arc-timeline">
        {sortedChapters.map((chapter, index) => {
          const chapterPlotPoints = plotPoints.filter(
            pp => pp.chapterId === chapter.id
          );
          const wordCount = chapter.content.split(/\s+/).filter(w => w.length > 0).length;

          return (
            <div key={chapter.id} className="timeline-item">
              <div className="timeline-marker">
                <div className="marker-dot">{index + 1}</div>
                <div className="marker-line" />
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <div className="timeline-title">{chapter.title}</div>
                  <div className="timeline-meta">{wordCount} words</div>
                </div>
                {chapter.synopsis && (
                  <div className="timeline-synopsis">{chapter.synopsis}</div>
                )}
                {chapterPlotPoints.length > 0 && (
                  <div className="timeline-plot-points">
                    {chapterPlotPoints.map(pp => (
                      <div
                        key={pp.id}
                        className="plot-point-badge"
                        style={{ backgroundColor: categoryColors[pp.category] }}
                      >
                        {pp.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {plotPoints.length > 0 && (
        <div className="arc-legend">
          <h4>Plot Point Categories</h4>
          <div className="legend-items">
            {Object.entries(categoryColors).map(([category, color]) => {
              const count = plotPoints.filter(pp => pp.category === category).length;
              if (count === 0) return null;
              return (
                <div key={category} className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: color }} />
                  <span className="legend-label">
                    {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default StoryArcView;








