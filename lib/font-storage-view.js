'use babel';

import SelectListView from 'atom-select-list'

export default class FontStorageView {

  constructor(serializedState) {
    this.keyBindingsForActiveElement = []
    this.selectListView = new SelectListView()
  }

  serialize() {}

  activate(){
      this.selectListView.reset()
      this.selectListView.focus()
  }

  async destroy () {
    await this.selectListView.destroy()
  }

getElement(){
  return this.selectListView;
}

}
