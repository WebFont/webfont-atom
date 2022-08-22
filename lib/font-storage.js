'use babel';

import SelectListView from 'atom-select-list';
import { CompositeDisposable } from 'atom';
import util from 'util';
import request from 'request';
import opn from 'opn';

const URL = 'https://fontstorage.com/api/plugins.json';
const DOWNLOAD_REMINDER = '/* Please do not use this import in production. You could download this font from here %s */';
const MENU_ITEMS = ['Import font', 'Download font(ttf/otf)', 'Subsetting', 'View on website'];

export default {
  fontStorageView: null,
  selectOptionView: null,
  subscriptions: null,
  modalPanel: null,

  activate() {
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'webfont:import': () => this.fetch(),
    }));
  },

  deactivate() {
    this.fontStorageView.destroy();
    this.selectOptionView.destroy();
    this.modalPanel.destroy();
    this.subscriptions.dispose();
  },

  fetch() {
    let editor;
    if (editor = atom.workspace.getActiveTextEditor()) {
      this.download().then((data) => {
        const fonts = data.fonts;
        const urls = data.urls;
        this.showFontsList(fonts, urls);
      }).catch((error) => {
        atom.notifications.addWarning(error.reason);
      });
    }
  },

  download() {
    return new Promise((resolve, reject) => {
      request(URL, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          resolve(JSON.parse(body));
        } else {
          reject({
            reason: "can't load fonts list file",
          });
        }
      });
    });
  },

  showFontsList(fonts, urls) {
    this.fontStorageView = new SelectListView({
      items: fonts,
      filterKeyForItem: (item) => item.name,
      elementForItem: (item) => {
        const element = document.createElement('li');
        element.textContent = item.name;
        return element;
      },
      didCancelSelection: () => {this.modalPanel.hide()},
      didConfirmSelection: (selectedItem) => {
        this.showOptions(selectedItem, urls);
        this.modalPanel.show();
        this.selectOptionView.focus();
      },
      emptyMessage: 'Fonts not found',
    });
    this.showModal(this.fontStorageView);
    this.fontStorageView.focus();
  },

  showOptions(font, urls) {
    this.selectOptionView = new SelectListView({
      items: MENU_ITEMS,
      elementForItem: (item) => {
        const element = document.createElement('li');
        element.textContent = item;
        return element;
      },
      didCancelSelection: () => {this.modalPanel.hide()},
      didConfirmSelection: (selectedItem) => {
        if (selectedItem === MENU_ITEMS[0]) this.insertFontImport(font, urls);
        if (selectedItem === MENU_ITEMS[1]) this.downloadFont(font, urls);
        if (selectedItem === MENU_ITEMS[2]) this.subsetting(font, urls);
        if (selectedItem === MENU_ITEMS[3]) this.viewOnWebsite(font, urls);
        this.modalPanel.hide();
      },
    });
    this.showModal(this.selectOptionView);
    this.selectOptionView.focus();
  },

  showModal(view) {
    this.modalPanel = atom.workspace.addModalPanel({
      item: view,
      visible: true,
    });
  },

  insertFontImport(font, urls) {
    editor = atom.workspace.getActiveTextEditor();
    let importText = util.format(DOWNLOAD_REMINDER, this.fontUrl(font, urls));
    importText += '\n';
    importText += `@import "${urls.import_url}${font.slug}.css";`;
    importText += '\n';
    importText += font.comments;
    editor.insertText(importText);
  },

  downloadFont(item, urls) {
    const fontUrl = `${urls.download_url}${item.slug}/${item.slug}.zip`;
    opn(fontUrl);
  },

  subsetting(item, urls) {
    const fontUrl = `${urls.converter_url}#${item.font_slug}`;
    opn(fontUrl);
  },

  viewOnWebsite(item, urls) {
    const fontUrl = this.fontUrl(item, urls);
    opn(fontUrl);
  },

  fontUrl(item, urls) {
    return `${urls.site_url}/font/${item.font_slug}?from=atom`;
  },
};
