/** App-wide scrollbar styling, injected once at the root. */
const GlobalStyles = () => (
  <style>{`
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #0a0a0a; }
    ::-webkit-scrollbar-thumb { background: #262626; border-radius: 4px; border: 1px solid #0a0a0a; }
    ::-webkit-scrollbar-thumb:hover { background: #dc2626; }
    * { scrollbar-width: thin; scrollbar-color: #262626 #0a0a0a; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

export default GlobalStyles;
