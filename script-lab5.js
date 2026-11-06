(function () {
    'use strict';

    const STORAGE_KEYS = { // ключи для localStorage
        theme: 'theme',
        gallery: 'gallery',
        galleryHidden: 'gallery_hidden'
    };
    const DEFAULT_IMAGE_URL = 'https://placehold.co/600x400?text=No+Image';

    // поиск элементов
    const changeThemeButton = document.getElementById('changeTheme');
    const changeGalleryButton = document.getElementById('hideGallery');
    const addPhotoForm = document.getElementById('addPhoto');
    const photoUrlInput = document.getElementById('photoUrl');
    const photoCaptionInput = document.getElementById('photoCaption');
    const formError = document.getElementById('formError');
    const galleryGrid = document.querySelector('#galleryGrid');
    const rootElement = document.documentElement;

    // проверка существования элементов
    function isElementMissing(element, name) {
        if (!element) {
            console.error(`Элемент "${name}" не найден в DOM.`);
            return true;
        }
        return false;
    }

    const requiredElements = [
        [changeThemeButton, 'changeTheme'],
        [changeGalleryButton, 'hideGallery'],
        [addPhotoForm, 'addPhoto'],
        [galleryGrid, '#galleryGrid']
    ];

    for (const [element, name] of requiredElements) {
        if (isElementMissing(element, name))
            return;
    }

    // сохранение состояния в localStorage и обработка ошибок
    const storage = {
        get(key, fallback = null) {
            try {
                const value = localStorage.getItem(key);
                return value === null ? fallback : value;
            }
            catch (error) {
                console.warn('localStorage.getItem недоступен:', error);
                return fallback;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, value);
            }
            catch (error) {
                console.warn('localStorage.setItem недоступен:', error);
            }
        },

        getJson(key, fallback) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : fallback;
            }
            catch (error) {
                console.warn('Не удалось прочитать JSON из localStorage:', error);
                return fallback;
            }
        },

        setJson(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            }
            catch (error) {
                console.warn('Не удалось сохранить JSON в localStorage:', error);
            }
        }
    };

    // переключение темы
    function applyTheme(theme) {
        if (theme === 'dark') {
            rootElement.setAttribute('data-theme', 'dark');
            changeThemeButton.textContent = 'Светлая тема';
        }
        else {
            rootElement.removeAttribute('data-theme');
            changeThemeButton.textContent = 'Тёмная тема';
        }
    }

    function initTheme() {
        const savedTheme = storage.get(STORAGE_KEYS.theme, 'light');
        applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
    }

    function handleChangeTheme() {
        const isDark = rootElement.getAttribute('data-theme') === 'dark';
        const nextTheme = isDark ? 'light' : 'dark';
        applyTheme(nextTheme);
        storage.set(STORAGE_KEYS.theme, nextTheme);
    }

    // модель галереи
    let galleryItems = [];
    let idCounter = 1;

    function createId() {
        return `photo-${Date.now()}-${idCounter++}`;
    }

    function isValidImageUrl(value) {
        if (typeof value !== 'string')
            return false;
        const url = value.trim();
        if (!url)
            return false;

        const httpPattern = /^https?:\/\/\S+$/i;
        const dataPattern = /^data:image\/[a-z]+;base64,/i;
        const relativePattern = /^(\/|\.\/|\.\.\/)?[\w\-.~/ ]+\.(jpe?g|png|gif|webp|svg|avif)(\?\S*)?$/i;

        return httpPattern.test(url) || dataPattern.test(url) || relativePattern.test(url);
    }

    // создание элемента
    function createGalleryItem(item) {
        const figure = document.createElement('figure');
        figure.className = 'gallery-item';
        figure.dataset.id = item.id;

        const image = document.createElement('img');
        image.src = item.url;
        image.alt = item.caption || 'Фотография из галереи';
        image.loading = 'lazy';

        image.addEventListener('error', () => {
            console.warn('Не удалось загрузить изображение:', item.url);
            image.alt = 'Изображение недоступно';
            image.style.opacity = '0.3';
        });

        const caption = document.createElement('figcaption');
        caption.textContent = item.caption || 'Без подписи';

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-photo';
        removeButton.setAttribute('aria-label', 'Удалить фото');
        removeButton.textContent = '✕';
        removeButton.addEventListener('click', () => removePhoto(item.id));

        figure.append(image, caption, removeButton);
        return figure;
    }

    // удаление старого набора элементов, создание нового
    function renderGallery() {
        galleryGrid.innerHTML = '';

        if (galleryItems.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'gallery-empty';
            emptyMessage.textContent = 'Галерея пуста. Добавьте первое фото.';
            galleryGrid.appendChild(emptyMessage);
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const item of galleryItems) {
            fragment.appendChild(createGalleryItem(item));
        }
        galleryGrid.appendChild(fragment);
    }

    // сохранение данных в localStorage
    function saveGallery() {
        storage.setJson(STORAGE_KEYS.gallery, galleryItems);
    }

    // добавление фото
    function addPhoto(url, caption) {
        const safeUrl = url && url.trim() ? url.trim() : DEFAULT_IMAGE_URL;

        galleryItems.push({
            id: createId(),
            url: safeUrl,
            caption: (caption || '').trim() || 'Без подписи'
        });

        saveGallery();
        renderGallery();
    }

    // удаление фото
    function removePhoto(id) {
        const index = galleryItems.findIndex((item) => item.id === id);

        if (index === -1) {
            console.warn('Попытка удалить несуществующий элемент:', id);
            return;
        }

        galleryItems.splice(index, 1);
        saveGallery();
        renderGallery();
    }

    // обработка ошибок при отправке формы
    function handleAddPhotoSubmit(event) {
        event.preventDefault();
        formError.textContent = '';

        const url = photoUrlInput.value.trim();
        const caption = photoCaptionInput.value.trim();

        if (url && !isValidImageUrl(url)) {
            formError.textContent = 'URL не похож на адрес изображения. Пример: https://site.com/photo.jpg';
            photoUrlInput.focus();
            return;
        }

        addPhoto(url, caption);
        addPhotoForm.reset();
        photoUrlInput.focus();
    }

    // скрытие/показ галереи
    function applyGalleryVisibility(isHidden) {
        if (isHidden) {
            galleryGrid.classList.add('hidden');
            galleryGrid.setAttribute('aria-hidden', 'true');
            changeGalleryButton.textContent = 'Показать галерею';
        }
        else {
            galleryGrid.classList.remove('hidden');
            galleryGrid.removeAttribute('aria-hidden');
            changeGalleryButton.textContent = 'Скрыть галерею';
        }
    }

    function handleChangeGallery() {
        const isHidden = galleryGrid.classList.contains('hidden');
        const nextHidden = !isHidden;
        applyGalleryVisibility(nextHidden);
        storage.set(STORAGE_KEYS.galleryHidden, nextHidden ? '1' : '0');
    }

    // восстановление состояния при перезагрузке
    function loadDefaultGallery() {
        const initialFigures = galleryGrid.querySelectorAll('.gallery-item');
        if (initialFigures.length === 0) {
            galleryItems = [];
            return;
        }

        const items = [];
        initialFigures.forEach((figure) => {
            const image = figure.querySelector('img');
            const caption = figure.querySelector('figcaption');
            items.push({
                id: createId(),
                url: image ? image.getAttribute('src') : '',
                caption: caption ? caption.textContent : 'Без подписи'
            });
        });
        galleryItems = items;
    }

    function initGallery() {
        const savedGallery = storage.getJson(STORAGE_KEYS.gallery, null);

        if (Array.isArray(savedGallery)) {
            galleryItems = savedGallery.filter(
                (item) => item && typeof item.id === 'string' && typeof item.url === 'string'
            );
            if (savedGallery.length > 0 && galleryItems.length === 0)
                loadDefaultGallery();
        }
        else
            loadDefaultGallery();

        renderGallery();
        saveGallery();

        const isHidden = storage.get(STORAGE_KEYS.galleryHidden, '0') === '1';
        applyGalleryVisibility(isHidden);
    }

    changeThemeButton.addEventListener('click', handleChangeTheme);
    changeGalleryButton.addEventListener('click', handleChangeGallery);
    addPhotoForm.addEventListener('submit', handleAddPhotoSubmit);

    initTheme();
    initGallery();
})();