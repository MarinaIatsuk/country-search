import { CountrySearchRepository } from '../api/country-search-repository.js';
import { CountrySearchController } from '../search/country-search-controller.js';
import type { Country, SearchViewState } from '../types.js';
import { SearchHistory } from './search-history.js';

function element<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}

function makeFact(label: string, value: string): HTMLElement {
  const fact = element('div', 'detail-fact');
  fact.append(element('span', 'fact-label', label));
  fact.append(element('span', 'fact-value', value || 'Нет данных'));
  return fact;
}

export class CountrySearchApp {
  private readonly repository: CountrySearchRepository;
  private readonly history: SearchHistory;
  private readonly controller: CountrySearchController;
  private input!: HTMLInputElement;
  private historyPanel!: HTMLElement;
  private resultsPanel!: HTMLElement;
  private clearButton!: HTMLButtonElement;

  constructor(root: HTMLElement = document.body) {
    this.repository = new CountrySearchRepository();
    this.history = new SearchHistory();
    this.buildShell(root);
    this.controller = new CountrySearchController(
      (state) => this.renderState(state),
      (query, signal) => this.repository.search(query, signal),
    );
    this.bindEvents();
    this.renderHistory();
  }

  private buildShell(root: HTMLElement): void {
    const shell = element('div', 'app-shell');
    const header = element('header', 'topbar');
    const brand = element('a', 'brand');
    brand.href = '#top';
    const brandMark = element('span', 'brand-mark', '◎');
    brandMark.setAttribute('aria-hidden', 'true');
    brand.append(brandMark, element('span', '', 'world atlas'));
    header.append(
      brand,
      element('span', 'top-note', 'Открывайте страны по одной строке'),
    );

    const main = element('main');
    main.id = 'top';
    const hero = element('section', 'hero');
    hero.setAttribute('aria-labelledby', 'page-title');
    const eyebrow = element('div', 'eyebrow');
    const dot = element('span', 'eyebrow-dot');
    dot.setAttribute('aria-hidden', 'true');
    eyebrow.append(dot, document.createTextNode('country discovery'));
    const title = element('h1');
    title.id = 'page-title';
    title.append(document.createTextNode('Найдите свой '));
    title.append(element('span', '', 'следующий мир'));
    const description = element(
      'p',
      'hero-copy',
      'Мгновенный поиск по странам. Узнайте столицу, регион, население и другие интересные факты.',
    );

    const searchPanel = element('div', 'search-panel');
    const searchIcon = element('span', 'search-icon', '⌕');
    searchIcon.setAttribute('aria-hidden', 'true');
    const searchLabel = element('label', 'sr-only', 'Название страны');
    searchLabel.htmlFor = 'country-search-input';
    this.input = element('input', 'search-input');
    this.input.id = 'country-search-input';
    this.input.type = 'search';
    this.input.name = 'country';
    this.input.placeholder = 'Начните вводить название страны…';
    this.input.autocomplete = 'off';
    this.input.setAttribute('aria-describedby', 'search-hint');
    this.clearButton = element('button', 'clear-button', 'Очистить');
    this.clearButton.type = 'button';
    this.clearButton.hidden = true;
    searchPanel.append(searchIcon, searchLabel, this.input, this.clearButton);

    const hint = element('p', 'search-hint');
    hint.id = 'search-hint';
    hint.append(document.createTextNode('Например: '));
    hint.append(element('kbd', '', 'Japan'));
    hint.append(document.createTextNode(' или '));
    hint.append(element('kbd', '', 'New Zealand'));
    this.historyPanel = element('div', 'history');
    this.historyPanel.setAttribute('aria-label', 'Недавние поисковые запросы');
    hero.append(eyebrow, title, description, searchPanel, hint, this.historyPanel);

    this.resultsPanel = element('section', 'results-area');
    this.resultsPanel.setAttribute('aria-live', 'polite');
    this.resultsPanel.setAttribute('aria-atomic', 'true');
    main.append(hero, this.resultsPanel);

    const footer = element('footer', 'footer');
    footer.append(document.createTextNode('Данные предоставлены '));
    const source = element('a', '', 'countries.dev');
    source.href = 'https://countries.dev/';
    source.target = '_blank';
    source.rel = 'noreferrer';
    footer.append(source, document.createTextNode(' · Поиск работает прямо в браузере'));

    shell.append(header, main, footer);
    root.append(shell);
  }

  private bindEvents(): void {
    this.input.addEventListener('input', () => {
      this.clearButton.hidden = this.input.value.length === 0;
      this.controller.onQueryChange(this.input.value);
    });
    this.clearButton.addEventListener('click', () => {
      this.input.value = '';
      this.clearButton.hidden = true;
      this.controller.onQueryChange('');
      this.input.focus();
    });
    this.input.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.input.value) {
        this.input.value = '';
        this.clearButton.hidden = true;
        this.controller.onQueryChange('');
      }
    });
  }

  private renderState(state: SearchViewState): void {
    this.resultsPanel.replaceChildren();
    if (state.status === 'idle') {
      this.resultsPanel.append(
        this.makeStatePanel(
          '✦',
          'Куда отправимся?',
          'Введите несколько букв — мы найдём подходящие страны.',
        ),
      );
      return;
    }
    if (state.status === 'loading') {
      const panel = element('div', 'state-panel');
      const content = element('div', 'state-inner');
      const spinner = element('div', 'spinner');
      spinner.setAttribute('aria-hidden', 'true');
      content.append(spinner, element('h2', 'state-title', `Ищем: ${state.query}`));
      content.append(element('p', 'state-copy', 'Связываемся с каталогом стран…'));
      panel.append(content);
      this.resultsPanel.append(panel);
      return;
    }
    if (state.status === 'empty') {
      this.resultsPanel.append(
        this.makeStatePanel(
          '⌕',
          'Ничего не найдено',
          `Для запроса «${state.query}» совпадений нет. Попробуйте другое название.`,
        ),
      );
      return;
    }
    if (state.status === 'error') {
      const panel = this.makeStatePanel(
        '!',
        'Не удалось выполнить поиск',
        state.errorMessage,
      );
      const retry = element('button', 'retry-button', 'Повторить поиск');
      retry.type = 'button';
      retry.addEventListener('click', () => this.controller.retry());
      panel.querySelector('.state-inner')?.append(retry);
      this.resultsPanel.append(panel);
      return;
    }

    this.renderCountries(state.countries, state.query);
    this.history.add(state.query);
    this.renderHistory();
  }

  private makeStatePanel(icon: string, title: string, copy: string): HTMLElement {
    const panel = element('div', 'state-panel');
    const content = element('div', 'state-inner');
    const symbol = element('div', 'state-icon', icon);
    symbol.setAttribute('aria-hidden', 'true');
    content.append(
      symbol,
      element('h2', 'state-title', title),
      element('p', 'state-copy', copy),
    );
    panel.append(content);
    return panel;
  }

  private renderCountries(countries: Country[], query: string): void {
    const header = element('div', 'results-head');
    header.append(element('h2', 'results-title', 'Подходящие страны'));
    header.append(
      element('span', 'results-meta', `${countries.length} найдено · «${query}»`),
    );
    const grid = element('div', 'country-grid');
    countries.forEach((country) => grid.append(this.makeCountryCard(country)));
    this.resultsPanel.append(header, grid);
  }

  private makeCountryCard(country: Country): HTMLElement {
    const article = element('article', 'country-card');
    const button = element('button', 'country-card-button');
    button.type = 'button';
    button.setAttribute('aria-label', `Подробнее о стране: ${country.name}`);

    const top = element('div', 'card-top');
    top.append(this.makeFlag(country, 'flag-wrap'));
    top.append(element('span', 'detail-arrow', '↗'));
    const name = element('h3', 'country-name', country.name);
    const region = element('span', 'country-region', country.subregion || country.region);
    const facts = element('div', 'card-facts');
    facts.append(this.makeCompactFact('Столица', country.capital || 'Нет данных'));
    facts.append(this.makeCompactFact('Население', formatNumber(country.population)));
    button.append(top, name, region, facts);
    button.addEventListener('click', () => this.openDetails(country));
    article.append(button);
    return article;
  }

  private makeFlag(country: Country, className: string): HTMLElement {
    const wrapper = element('span', className);
    if (country.flagUrl) {
      const image = element('img', 'flag-image');
      image.src = country.flagUrl;
      image.alt = `Флаг страны ${country.name}`;
      image.loading = 'lazy';
      image.addEventListener(
        'error',
        () => {
          image.replaceWith(element('span', 'flag-emoji', country.flagEmoji || '🌐'));
        },
        { once: true },
      );
      wrapper.append(image);
    } else {
      wrapper.append(element('span', 'flag-emoji', country.flagEmoji || '🌐'));
    }
    return wrapper;
  }

  private makeCompactFact(label: string, value: string): HTMLElement {
    const fact = element('div', 'compact-fact');
    fact.append(
      element('span', 'fact-label', label),
      element('span', 'fact-value', value),
    );
    return fact;
  }

  private openDetails(country: Country): void {
    const backdrop = element('div', 'detail-backdrop');
    const dialog = element('section', 'detail-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'detail-title');
    const close = element('button', 'close-button', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Закрыть подробности');
    const closeDialog = (): void => {
      backdrop.remove();
      document.removeEventListener('keydown', onKeyDown);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closeDialog();
    };
    close.addEventListener('click', closeDialog);
    backdrop.addEventListener('click', (event: MouseEvent) => {
      if (event.target === backdrop) closeDialog();
    });
    document.addEventListener('keydown', onKeyDown);

    const hero = element('div', 'detail-hero');
    const flag = this.makeFlag(country, 'detail-flag');
    hero.append(flag);
    const heading = element('div');
    const countryName = element('h2', 'detail-name', country.name);
    countryName.id = 'detail-title';
    heading.append(countryName, element('p', 'detail-subtitle', country.officialName));
    hero.append(heading);

    const body = element('p', 'detail-description', country.description);
    const facts = element('div', 'detail-grid');
    facts.append(
      makeFact('Столица', country.capital),
      makeFact(
        'Регион',
        country.subregion ? `${country.region} · ${country.subregion}` : country.region,
      ),
      makeFact('Население', formatNumber(country.population)),
      makeFact(
        'Площадь',
        country.area === null ? '' : `${formatNumber(country.area)} км²`,
      ),
      makeFact('Языки', country.languages.join(', ')),
      makeFact('Валюта', country.currencies.join(', ')),
    );
    dialog.append(close, hero, body, facts);
    if (country.borders.length > 0) {
      dialog.append(element('h3', 'detail-section-title', 'Сухопутные границы'));
      const borders = element('div', 'border-list');
      country.borders.forEach((border) =>
        borders.append(element('span', 'border-tag', border)),
      );
      dialog.append(borders);
    }
    backdrop.append(dialog);
    document.body.append(backdrop);
    close.focus();
  }

  private renderHistory(): void {
    this.historyPanel.replaceChildren();
    const recent = this.history.getRecent();
    this.historyPanel.hidden = recent.length === 0;
    if (recent.length === 0) return;
    this.historyPanel.append(element('span', 'history-label', 'Недавно:'));
    recent.forEach((query) => {
      const button = element('button', 'history-item', query);
      button.type = 'button';
      button.addEventListener('click', () => {
        this.input.value = query;
        this.clearButton.hidden = false;
        this.controller.onQueryChange(query);
        this.input.focus();
      });
      this.historyPanel.append(button);
    });
  }
}
