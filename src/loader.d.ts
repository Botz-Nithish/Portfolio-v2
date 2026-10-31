/** Set by the inline script in index.html, which runs before the bundle. */
interface Loader {
  /** How much bigger than its place in the title the loader's O is drawn. */
  layout: { zoom: number };
  /** One more milestone reached. */
  step(): void;
  /** Fills the O and resolves on its last frame, which the intro picks up from. */
  finish(): Promise<void>;
  /** Fades out without filling, for visits that skip the intro. */
  dismiss(): Promise<void>;
  remove(): void;
}

interface Window {
  __loader: Loader;
}
