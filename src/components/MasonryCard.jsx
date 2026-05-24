export function MasonryCard({
  image,
  liked,
  onLike,
  onShare,
  onOpen
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onOpen();
    }
  };

  const handleLikeClick = (e) => {
    e.stopPropagation();
    onLike();
  };

  const handleShareClick = (e) => {
    e.stopPropagation();
    onShare();
  };

  return (
    <div
      className="masonry-item"
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={onOpen}
    >
      <img
        className="masonry-image"
        src={image.src}
        alt={image.title}
        loading="lazy"
      />

      <div className="image-overlay">
        <div className="image-info">
          <h3>{image.title}</h3>
          <p>{image.description}</p>
        </div>

        <div className="image-actions">
          <button
            className="action-button like-button"
            onClick={handleLikeClick}
            title={liked ? 'Unlike' : 'Like'}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            {liked ? '❤️' : '🤍'}
          </button>
          <button
            className="action-button share-button"
            onClick={handleShareClick}
            title="Share"
            aria-label="Share"
          >
            🔗
          </button>
        </div>
      </div>
    </div>
  );
}

export default MasonryCard;
