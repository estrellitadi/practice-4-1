import { Book } from './task1-types';
import { applyFilters, filterByAuthor, filterByMinYear } from './task3-filters';
import { createBookFromForm } from "./task4-integration";
import { filterByTitle, sortBooks } from './task5-utils';
import { BookCatalog } from './task6-classes';
import { Wishlist } from './task7-wishlist';

import { fetchBooks, saveBooks } from './mock-api';

// ============================================================
// 2. ПАТТЕРН СОСТОЯНИЙ (AsyncState)
// ============================================================
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success', data: T }
  | { status: 'error', message: string };

let state: AsyncState<Book[]> = { status: 'loading' };
let tempErrorMessage = ''; 

// 3. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ (Wishlist остался синхронным)
// ============================================================
let wishlist = new Wishlist();
const savedWishlist = localStorage.getItem('wishlist');
if (savedWishlist) {
  wishlist = new Wishlist(JSON.parse(savedWishlist));
}

const bookList = document.querySelector('#bookList') as HTMLDivElement;
const wishlistContainer = document.querySelector('#wishlistContainer') as HTMLDivElement;
const form = document.querySelector('#bookForm') as HTMLFormElement;
const filterBtn = document.querySelector('#applyFilters') as HTMLButtonElement;
const authorInput = document.querySelector('#filterAuthor') as HTMLInputElement;
const yearInput = document.querySelector('#filterYear') as HTMLInputElement;
const errorMessage = document.querySelector('#errorMessage') as HTMLDivElement;
const searchInput = document.querySelector('#searchInput') as HTMLInputElement;
const sortBySelect = document.querySelector('#sortBy') as HTMLSelectElement;

// ============================================================
// 4. СОЗДАНИЕ КАРТОЧКИ (Обновлено для асинхронности)
// ============================================================
function createBookCard(book: Book): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'book-card';

  const titleEl = document.createElement('h3');
  titleEl.textContent = `${book.title} — ${book.authors.join(', ')}${book.year ? `, ${book.year}` : ''}`;
  card.append(titleEl);

  if (book.rating !== undefined) {
    const ratingEl = document.createElement('p');
    ratingEl.textContent = `Рейтинг: ${book.rating}`;
    card.append(ratingEl);
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', async () => {
    if (state.status === 'success') {
      const currentBooks = state.data;
      const newBooks = currentBooks.filter(b => b.id !== book.id);
      
      try {
        await saveBooks(newBooks); 
        state = { status: 'success', data: newBooks };
        render();
      } catch (error) {
        tempErrorMessage = error instanceof Error ? error.message : 'Ошибка удаления';
        render();
        setTimeout(() => { tempErrorMessage = ''; render(); }, 3000);
      }
    }
  });
  card.append(deleteBtn);

  const favBtn = document.createElement('button');
  favBtn.textContent = wishlist.has(book.id) ? '❤️ В избранном' : '🤍 В избранное';
  favBtn.addEventListener('click', () => {
    wishlist.toggle(book.id);
    localStorage.setItem('wishlist', JSON.stringify(wishlist.getFavoriteIds()));
    render(); 
  });
  card.append(favBtn);

  return card;
}

// ============================================================
// 5. ОТРИСОВКА (Render на основе AsyncState)
// ============================================================
function render() {
  bookList.innerHTML = '';
  wishlistContainer.innerHTML = '';
  errorMessage.textContent = tempErrorMessage;

  switch (state.status) {
    case 'idle':
      bookList.textContent = 'Нажмите "Загрузить", чтобы начать.';
      break;
      
    case 'loading':
      bookList.innerHTML = '<p style="text-align: center; font-size: 1.2em; padding: 20px;">⏳ Загрузка данных...</p>';
      break;
      
    case 'success': {
      const allBooks = state.data; 
      
      const filters: ((book: Book) => boolean)[] = [];
      if (authorInput.value.trim()) filters.push(filterByAuthor(authorInput.value.trim()));
      if (yearInput.value) filters.push(filterByMinYear(parseInt(yearInput.value, 10)));
      if (searchInput.value.trim()) filters.push(filterByTitle(searchInput.value.trim()));
      
      const filtered = applyFilters(allBooks, filters);
      const sorted = sortBooks(filtered, sortBySelect.value as 'year' | 'rating');

      if (sorted.length === 0) {
        bookList.textContent = 'Книги не найдены. Попробуйте изменить фильтры.';
      } else {
        sorted.forEach(book => {
          bookList.append(createBookCard(book));
        });
      }

      const tempCatalog = new BookCatalog('main', allBooks);
      const favBooks = wishlist.getFavorites(tempCatalog);
      
      if (favBooks.length === 0) {
        wishlistContainer.textContent = 'Пока ничего не добавлено';
      } else {
        favBooks.forEach(book => {
          wishlistContainer.append(createBookCard(book));
        });
      }
      break;
    }
    
    case 'error':
      bookList.innerHTML = `
        <div style="color: red; text-align: center; padding: 20px; border: 1px solid red; border-radius: 8px; margin: 20px;">
          <p>❌ ${state.message}</p>
          <button id="retryBtn" style="padding: 8px 16px; cursor: pointer; margin-top: 10px; background: #ffebee; border: 1px solid red; border-radius: 4px;">Повторить попытку</button>
        </div>
      `;
      // Задание 5: обработчик кнопки "Повторить"
      const retryBtn = document.querySelector('#retryBtn') as HTMLButtonElement;
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          initApp(); // Перезапуск цикла загрузки
        });
      }
      break;
  }
}

// ============================================================
// 6. АСИНХРОННАЯ ИНИЦИАЛИЗАЦИЯ (Задание 3)
// ============================================================
async function initApp() {
  state = { status: 'loading' };
  render();

  try {
    const books = await fetchBooks();
    state = { status: 'success', data: books };
  } catch (error) {
    state = { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Неизвестная ошибка' 
    };
  }
  
  render();
}

// ============================================================
// 7. ОБРАБОТЧИК ФОРМЫ (Асинхронный, Задание 4)
// ============================================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMessage.textContent = '';

  if (state.status !== 'success') return;

  try {
    const formData = new FormData(form);
    const newBook = createBookFromForm(formData);
    
    const currentBooks = state.data;
    const newBooksArray = [...currentBooks, newBook];
    
    await saveBooks(newBooksArray);
    
    state = { status: 'success', data: newBooksArray };
    form.reset();
    render();
  } catch (error) {
   
    tempErrorMessage = error instanceof Error ? error.message : 'Ошибка сохранения';
    render();
    setTimeout(() => {
      tempErrorMessage = '';
      render();
    }, 3000);
  }
});

// ============================================================
// 8. ФИЛЬТРЫ И СОРТИРОВКА
// ============================================================
filterBtn.addEventListener('click', render);
searchInput.addEventListener('input', render);
sortBySelect.addEventListener('change', render);

initApp();