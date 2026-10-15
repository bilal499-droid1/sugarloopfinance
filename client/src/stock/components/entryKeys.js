import { useEffect, useRef } from 'react';

// Keyboard helpers shared by the purchase and return entry screens (old POS style:
// Enter moves to the next box, Ctrl+S saves). Set `saveRef.current` to the save
// function once it's defined; `firstField` gets focus when the form opens.
export const useEntryKeys = (names, firstField) => {
  const refs = useRef(Object.fromEntries(names.map((n) => [n, { current: null }]))).current;
  const saveRef = useRef(() => {});
  const focus = (name) => setTimeout(() => refs[name].current?.focus(), 0);
  const nextOnEnter = (name) => (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      focus(name);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    refs[firstField].current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { refs, focus, nextOnEnter, saveRef };
};
