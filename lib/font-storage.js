'use babel';

import SelectListView from 'atom-select-list'
import { CompositeDisposable } from 'atom'
import util from 'util'
import request from 'request'
import fs from 'fs'
import os from 'os'
import path from 'path'
import opn from 'opn'

const URL = 'https://fontstorage.com/api/list.json'
const SITE_URL = 'https://fontstorage.com/'
const DOWNLOAD_REMINDER = "/* Please do not use this import in production. You could download this font from here %s */"
const FONTS_LIST_FILE = 'fontsList.json';

export default {

  fontStorageView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {

    const fontsList = this.readFontsListFromFile()

    this.fontStorageView = new SelectListView({
      items: fontsList,
      filterKeyForItem: (item) => item.name,
      didConfirmSelection: (selectedItem) => {

        if (this.fontStorageView.downloadFont) {
          this.downloadFontFromWebsite(selectedItem);
        } else {
          this.insertFontImport(selectedItem);
        }

        this.modalPanel.hide()
      },
      didCancelSelection: () => {
        this.modalPanel.hide()
      },
      elementForItem: (item) => {
        const element = document.createElement('li')
        element.textContent = item.name
        return element
      },
      loadingMessage: 'Loading fonts list...'
    });

    this.modalPanel = atom.workspace.addModalPanel({
      item: this.fontStorageView,
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'webfont:import': () => this.toggle(false),
      'webfont:download': () => this.toggle(true)
    }));
  },

  deactivate() {
    this.fontStorageView.destroy();
    this.modalPanel.destroy();
    this.subscriptions.dispose();
  },

  firstTimeInitialize(callback){
    console.log('firstTimeInitialize')

    this.downloadFontsList((body)=>{
      if (body) {
        console.log('Adding items...')

        let items = JSON.parse(body)
        callback(items)
      }
    });
  },

  downloadFontsList(callback){
    console.log('downloading fonts list')
    console.log(os.tmpdir())
    request(URL, (error, response, body) => {
      if (error) {
        console.error('error:', error)
        if (callback) {
          callback(null)
        }
      } else {
        console.log('loading completed')
        if (callback) {
          callback(body)
        }
        try{
          fs.writeFileSync(path.join(os.tmpdir(), FONTS_LIST_FILE), body,{flag:'w'})
        } catch (e) {
          console.error('error while saving fonts list:', e)
        }
      }
    });
  },

  readFontsListFromFile(){
      try{
        let fullFileName = path.join(os.tmpdir(), FONTS_LIST_FILE)
        if (fs.existsSync(fullFileName)){
          let fileContent = fs.readFileSync(fullFileName)
          let result = JSON.parse(fileContent)
          return result;
        } else {
          return []
        }
      } catch(e) {
        console.error("can't load fonts list file", e)
        return []
      }
  },

  serialize() {
    return {
    };
  },

  insertFontImport(item){
    editor = atom.workspace.getActiveTextEditor()
    if (editor) {
      let importText = util.format(DOWNLOAD_REMINDER, item.font_url)
      importText += "\n"
      importText += item.import
      importText += "\n"
      importText += item.comments

      editor.insertText(importText)
    }
  },

  downloadFontFromWebsite(item){
    let fontUrl = item.font_url + "?utm_source=atom"
    opn(fontUrl)
  },

  /**
   * Show or hide fonts lis
   */
  toggle(downloadFont) {
    console.log('FontStorage was toggled!')

     if (this.modalPanel.isVisible()) {
       this.hideFontsList()
     } else {
        this.showFontsList(downloadFont)
     }
  },

  showFontsList(downloadFont) {
    this.fontStorageView.downloadFont = downloadFont
    let items = this.readFontsListFromFile()
    if (items.length > 0) {
      this.fontStorageView.update({items: items, loadingMessage: null})
    } else {
      this.firstTimeInitialize((downloadedItems) => {
        this.fontStorageView.update({items: downloadedItems, loadingMessage: null});
      })
    }

   this.modalPanel.show()
   this.fontStorageView.focus()
 },

  hideFontsList() {
    this.modalPanel.hide()

    // update fonts list in background
    this.downloadFontsList()
  }
};
