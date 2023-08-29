import axios from "axios"
import { Component } from "react";
import { io } from 'socket.io-client';
import { SERVER_API_URL } from '../config';
import { Box } from '@mui/material'
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import { StyledTabs, StyledTab } from '../components/TabPanel'
import { TimeSeriesPanel } from "../components/TimeSeriesPanel";
import { KernelPanel } from "../components/KernelPanel";
import { DebugPanel } from "../components/DebugPanel";
import { SERVER_URL } from "../config"

export class PRun extends Component {
    constructor(props) {
        super(props)
        this.state = {
            current_tab: 0,
            session_info: null,
        }
        this.socket = io(`${SERVER_URL}${this.props.match.params.session_id}`);
        console.log(this.socket)
    }

    componentDidMount() {
        this.load_session_info()
    }

    renderTabSelector() {
        return (
            <StyledTabs value={this.state.current_tab} onChange={(_, v) => { this.setState({ current_tab: v }) }}>
                <StyledTab label="Time Series" />
                <StyledTab label="Graph Inspect" />
                <StyledTab label="Kernels" />
            </StyledTabs>
        )
    }

    render() {
        return (
            <>
                <div style={{ padding: "0px 16px" }}>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <h1>TinyBoard</h1>
                        <div><a href="/">Home</a></div>
                    </div>
                    {this.state.session_info !== null ?
                        <>
                            <p>name: <b>{this.state.session_info.name}</b> | cmdline: <i>python {this.state.session_info.args}</i> | session: <i>{this.props.match.params.session_id}</i></p>
                        </> : <p>No session found, go <a href="/">home</a> and try again.</p>}
                </div>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    {this.renderTabSelector()}
                </Box>
                <TimeSeriesPanel current_tab={this.state.current_tab} index={0} socket={this.socket} session={this.props.match.params.session_id} />
                <DebugPanel current_tab={this.state.current_tab} index={1} socket={this.socket} session={this.props.match.params.session_id} />
                <KernelPanel current_tab={this.state.current_tab} index={2} socket={this.socket} session={this.props.match.params.session_id} />
            </>
        )
    }

    load_session_info() {
        axios.get(
            SERVER_API_URL + "get_session/" + this.props.match.params.session_id,
        ).then(response => {
            if (response.data.length > 0) {
                this.setState({ session_info: response.data[0] })
            }
        }).catch(error => {
            console.log("dai", error)
        })
    }
}