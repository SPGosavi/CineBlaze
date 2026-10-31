/** Centred spinner for full-page loading states. */
export default function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center text-accent">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-rule border-t-accent" />
    </div>
  );
}
