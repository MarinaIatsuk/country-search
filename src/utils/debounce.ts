export function debounce<Arguments extends unknown[]>(
  callback: (...args: Arguments) => void,
  delay: number,
): (...args: Arguments) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: Arguments): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      callback(...args);
    }, delay);
  };
}
