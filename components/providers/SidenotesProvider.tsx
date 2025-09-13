'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { combineReducers, applyMiddleware, createStore } from 'redux';
import { thunk } from 'redux-thunk';
import * as sidenotes from 'sidenotes';

// Create the store with sidenotes reducer
const reducer = combineReducers({
  sidenotes: sidenotes.reducer,
});

const store = createStore(reducer, applyMiddleware(thunk));

// Set up the sidenotes library
sidenotes.setup(store as sidenotes.Store, { padding: 10 });

interface SidenotesProviderProps {
  children: React.ReactNode;
}

export function SidenotesProvider({ children }: SidenotesProviderProps) {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
}