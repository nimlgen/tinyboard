import axios from "axios"
import { Component } from "react";
import { SERVER_URL, SERVER_API_URL } from "../config.js";
import { Card, Grid, CardActions, Button, CardContent } from '@mui/material'
import { io } from 'socket.io-client';

export class PMain extends Component {
    constructor(props) {
        super(props)
        this.state = {
            sessions: [],
        }

        this.socket = io(`${SERVER_URL}`);
    }

    componentDidMount() {
        this.loadSessions()
        this.socket.on("init", (dt) => { this.restore_sessions(JSON.parse(dt)) })
    }

    restore_sessions(data) {
        var sessions = structuredClone(this.state.sessions)
        Array.from(data).forEach((item) => {
            sessions.push(item)
        })
        this.setState({ sessions: sessions })
    }

    get_date(d) {
        var date = new Date(+parseInt(d))
        return date.toDateString() + " " + date.toLocaleTimeString()
    }

    render_sessions() {
        return (<>
            {
                this.state.sessions.toReversed().map((val, index) => (
                    <Grid xs={3} style={{ padding: "16px" }}>
                        <Card variant="outlined" style={{ padding: "16px" }}>
                            <CardContent>
                                <div>{this.get_date(val.tstamp)}</div>
                                <h4>{val.name}</h4>
                                <div style={{ opacity: 0.4 }}>session: <i>{val.session}</i></div>
                                <div style={{ opacity: 0.4 }}>cmdline: <i>python {val.args}</i></div>
                            </CardContent>
                            <CardActions>
                                <a style={{ padding: "8px" }} href={`/run/${val.session}`}>Open board</a>
                            </CardActions>
                        </Card>
                    </Grid>
                ))
            }
        </>)
    }

    render() {
        return (
            <>
                <h1 style={{ padding: "0px 16px" }}>TinyBoard</h1>
                <Grid container>
                    {this.render_sessions()}
                </Grid>
            </>
        )
    }

    loadSessions() {
        axios.get(
            SERVER_API_URL + "sessions",
        ).then(response => {
            this.restore_sessions(response.data)
        }).catch(error => {
            console.log("dai", error)
        })
    }
}