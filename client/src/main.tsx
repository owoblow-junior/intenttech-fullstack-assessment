import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store';
import App from './App';
import { Notices } from './components';
import '@fontsource-variable/inter';
import './styles.css';
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="state-panel">
        <h1>Something went wrong.</h1>
        <p>Reload the workspace to try again.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>
          <Notices>
            <a className="skip-link" href="#main-content">
              Skip to main content
            </a>
            <App />
          </Notices>
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>,
);
