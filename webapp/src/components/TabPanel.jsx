import { Component } from "react";
import { Tabs, Tab } from '@mui/material'
import { styled } from '@mui/material/styles';

export class TabPanel extends Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (<div
            role="tabpanel"
            hidden={this.props.value !== this.props.index}
        >
            {this.props.value === this.props.index ? this.props.children : null}
        </div>)
    }
}

export const StyledTabs = styled(Tabs)({
    borderBottom: '1px solid #0008',
    '& .MuiTabs-indicator': {
        backgroundColor: '#000',
    },
});

export const StyledTab = styled((props) => <Tab {...props} />)(
    ({ theme }) => ({
        textTransform: 'none',
        minWidth: 0,
        [theme.breakpoints.up('sm')]: {
            minWidth: 0,
        },
        fontWeight: theme.typography.fontWeightRegular,
        marginRight: theme.spacing(1),
        color: 'rgba(0, 0, 0, 0.85)',
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
        '&:hover': {
            color: 'black',
            opacity: 1,
        },
        '&.Mui-selected': {
            color: 'black',
            fontWeight: theme.typography.fontWeightBold,
        },
        '&.Mui-focusVisible': {
            backgroundColor: 'black',
        },
        '& .MuiTabs-indicatorSpan': {
            maxWidth: 40,
            width: '100%',
            backgroundColor: '#000',
        },
    }),
);
