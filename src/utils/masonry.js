export function createMasonryColumns(images, numColumns) {
  const columns = Array.from({ length: numColumns }, () => []);
  const columnHeights = Array(numColumns).fill(0);

  images.forEach((image) => {
    const aspectRatio = image.aspectRatio ?? 1;

    const shortestColumnIndex = columnHeights.indexOf(
      Math.min(...columnHeights)
    );

    columns[shortestColumnIndex].push(image);
    columnHeights[shortestColumnIndex] += aspectRatio;
  });

  return columns;
}

export default createMasonryColumns;
