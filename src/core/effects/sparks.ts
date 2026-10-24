/**
 * Adds `count` spark elements to `container`. Each one only carries its trajectory as CSS
 * variables; the `po-spark` keyframes in theme.css do the rest. Returns the sparks so they can
 * be removed once the phase is over.
 */
export function spawnSparks(container: HTMLElement, count: number, random: () => number = Math.random): HTMLElement[] {
  return Array.from({ length: Math.max(0, Math.round(count)) }, () => {
    const spark = document.createElement('span');
    spark.dataset.part = 'spark';
    // Mostly upwards, out of the opening.
    const angle = -Math.PI / 2 + (random() - 0.5) * Math.PI * 0.9;
    const distance = 40 + random() * 90;
    spark.style.setProperty('--po-spark-x', random().toFixed(3));
    spark.style.setProperty('--po-spark-dx', `${(Math.cos(angle) * distance).toFixed(1)}px`);
    spark.style.setProperty('--po-spark-dy', `${(Math.sin(angle) * distance).toFixed(1)}px`);
    spark.style.setProperty('--po-spark-time', (0.7 + random() * 0.6).toFixed(2));
    container.append(spark);
    return spark;
  });
}
