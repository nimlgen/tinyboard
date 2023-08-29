import { Component } from "react";
import { Paper } from '@mui/material'
import { SERVER_API_URL } from '../config';
import axios from "axios"
import { TabPanel } from '../components/TabPanel'
import Grid from '@mui/material/Grid';
import CanvasJSReact from '@canvasjs/react-charts';
var CanvasJSChart = CanvasJSReact.CanvasJSChart;

export class TimeSeriesPanel extends Component {
    constructor(props) {
        super(props)

        this.state = {
            time_series: {},
        }
    }

    componentDidMount() {
        this.restore_data()
        this.props.socket.on("graph", (dt) => { this.restore_graphs(JSON.parse(dt)) })
    }

    series_to_chart_series(type, jseries) {
        var series = JSON.parse(jseries)
        var res = []
        if (type == "line") {
            series.forEach((graph_series) => {
                var res_graph_series = []
                graph_series.forEach((item) => {
                    res_graph_series.push({ y: item })
                })
                res.push(res_graph_series)
            })
        }
        return res
    }

    restore_graphs(data) {
        var time_series = structuredClone(this.state.time_series)
        Array.from(data).forEach((item) => {
            var series = this.series_to_chart_series(item.type, item.series)
            var graphinfo = JSON.parse(item.graphinfo)
            if (time_series[item.name] === undefined) {
                time_series[item.name] = { type: item.type, series: [] }
                series.forEach((_, i) => {
                    var sh = { type: "spline", showInLegend: true, dataPoints: [] }
                    if (graphinfo['series_names'] !== undefined) {
                        sh.name = graphinfo['series_names'][i]
                    }
                    time_series[item.name].series.push(sh)
                })
            }
            series.forEach((s, i) => {
                time_series[item.name].series[i].dataPoints = time_series[item.name].series[i].dataPoints.concat(s)
            })
        });
        this.setState({ time_series: time_series })
    }

    render_graph(key) {
        const options = {
            animationEnabled: false,
            toolTip: {
                shared: true
            },
            data: this.state.time_series[key].series
        }

        return (
            <div>
                <CanvasJSChart options={options} />
            </div>
        );
    }

    render_graphs() {
        return (<>
            {
                Object.keys(this.state.time_series).map((key, index) => (
                    <Grid xs={6} style={{ "padding": "16px" }}>
                        <Paper style={{ "padding": "16px" }}>
                            <h5>{key}</h5>
                            {
                                this.state.time_series[key].type == "line" ?
                                    this.render_graph(key) : null
                            }
                        </Paper>
                    </Grid>
                ))
            }
        </>)
    }

    render() {
        return (
            <TabPanel value={this.props.current_tab} index={this.props.index}>
                <Grid container>
                    {Object.keys(this.state.time_series).length > 0 ? this.render_graphs() :
                        <p style={{ "padding": "16px" }}>To plot use <i>tinyboard_log_graph</i> API.</p>
                    }
                </Grid>
            </TabPanel>
        )
    }

    restore_data() {
        axios.get(
            SERVER_API_URL + "restore_graphs/" + this.props.session,
        ).then(response => {
            this.restore_graphs(response.data)
        }).catch(error => {
            console.log("oops", error)
        })
    }

}
