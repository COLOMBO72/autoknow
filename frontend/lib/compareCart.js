'use client';

const KEY = 'ak_compare_cart';

export function getCart() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToCart(car) {
  const cart = getCart();
  const exists = cart.some(
    (c) => c.brand === car.brand && c.model === car.model && c.yearFrom === car.yearFrom && c.engine === car.engine,
  );
  if (exists) return cart;
  const next = [...cart, car].slice(0, 5); // лимит сравнения — 5
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removeFromCart(index) {
  const cart = getCart();
  const next = cart.filter((_, i) => i !== index);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearCart() {
  window.localStorage.removeItem(KEY);
}
