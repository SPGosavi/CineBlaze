/** Centred spinner for full-page loading states. */
const FullPageSpinner = () => (
  <div className="min-h-screen bg-black flex items-center justify-center text-red-600">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current"></div>
  </div>
);

export default FullPageSpinner;
