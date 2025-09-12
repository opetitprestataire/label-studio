import { getRoot, types } from "mobx-state-tree";

export const TabSelectedItems = types
  .model("TabSelectedItems", {
    all: false,
    map: types.map(types.boolean),
  })
  .views((self) => ({
    get snapshot() {
      return {
        all: self.all,
        [self.listName]: Array.from(self.map.keys()),
      };
    },

    get listName() {
      return self.all ? "excluded" : "included";
    },

    get hasSelected() {
      return self.isAllSelected || self.isIndeterminate;
    },

    get isAllSelected() {
      return self.all && self.map.size === 0;
    },

    get isIndeterminate() {
      return self.map.size > 0;
    },

    get list() {
      return Array.from(self.map.keys());
    },

    get length() {
      return self.list.length;
    },

    get total() {
      if (self.all) {
        const totalCount = getRoot(self).dataStore.total ?? 0;

        return totalCount - self.length;
      }
      return self.length;
    },

    isSelected(id) {
      if (self.all) {
        return !self.map.has(id);
      }
      return self.map.has(id);
    },
  }))
  .actions((self) => ({
    afterCreate() {
      self._invokeChangeEvent();
    },

    toggleSelectedAll() {
      if (!self.all || !(self.all && self.isIndeterminate)) {
        self.all = !self.all;
      }

      self.map.clear();
      self._invokeChangeEvent();
    },

    toggleMany(ids) {
      ids.forEach((id) => {
        if (self.map.has(id)) self.map.delete(id);
        else self.map.set(id, true);
      });
      self._invokeChangeEvent();
    },

    replaceAll(ids) {
      self.map.clear();
      ids.forEach((id) => self.map.set(id, true));
      self._invokeChangeEvent();
    },

    addItem(id) {
      self.map.set(id, true);
      self._invokeChangeEvent();
    },

    removeItem(id) {
      self.map.delete(id);
      self._invokeChangeEvent();
    },

    toggleItem(id) {
      if (self.map.has(id)) {
        self.map.delete(id);
      } else {
        self.map.set(id, true);
      }
      self._invokeChangeEvent();
    },

    update(data) {
      self.all = data?.all ?? self.all;
      self.map.clear();
      data?.[self.listName]?.forEach((id) => self.map.set(id, true));
      self._invokeChangeEvent();
    },

    clear() {
      self.all = false;
      self.map.clear();
      self._invokeChangeEvent();
    },

    _invokeChangeEvent() {
      getRoot(self).SDK.invoke("taskSelectionChanged", self);
    },
  }))
  .preProcessSnapshot((sn) => {
    const { included, excluded, all } = sn ?? {};
    const result = { all, list: sn.list ?? (all ? excluded : included) };

    return result;
  });
