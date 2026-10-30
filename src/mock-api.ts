import { Book } from './task1-types';

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchBooks(): Promise<Book[]> {
  await delay(800);
  
  if (Math.random() < 0.2) {
    throw new Error('Сбой сети. Не удалось загрузить книги.');
  }
  
  const saved = localStorage.getItem('catalog');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed.books || [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function saveBooks(books: Book[]): Promise<void> {
  await delay(500);
  localStorage.setItem('catalog', JSON.stringify({ id: 'main', books }));
}