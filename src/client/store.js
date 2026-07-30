// ─────────────────────────────────────────────────────────────────────────────
// src/client/store.js — Configuration Redux store
// ─────────────────────────────────────────────────────────────────────────────

import { applyMiddleware, createStore } from "redux";
import { thunk } from "redux-thunk";
import rootReducer from "./reducers";

const store = createStore(
  rootReducer,
  applyMiddleware(thunk),
);

export default store;
