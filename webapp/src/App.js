import {
    BrowserRouter as Router,
    Switch,
    Route,
} from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css'

import history from './history'
import { PMain } from './pages/PMain';
import { PRun } from './pages/PRun';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import { grey } from '@mui/material/colors';

import './css/main.css'

const theme = createTheme({
  palette: {
    primary: grey,
  },
  typography: {
    fontFamily: [
      '"Lucida Console", monospace',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
});

function App() {
    return (
      <ThemeProvider theme={theme}>
        <Router history={history}>
            <Switch>
                <Route
                    exact path="/"
                    render={(props) => <PMain {...props} />}>
                </Route>
                <Route
                    exact path="/run/:session_id"
                    render={(props) => <PRun {...props} />}>
                </Route>
                {/* <Route
                    exact path="/404"
                    render={(props) => <P404 {...props} />}>
                </Route>
                <Route
                    exact path="/sitemap"
                    render={(props) => <PSitemap {...props} />}>
                </Route>
                <Route
                    exact path="*"
                    unknownPage
                    render={(props) => <P404 {...props} />}>
                </Route> */}
            </Switch>
        </Router>
        </ThemeProvider>
    )
}

export default App