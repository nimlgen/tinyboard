import { Component } from "react";
import { Box, Tabs, Tab, Paper } from '@mui/material'
import { SERVER_API_URL } from '../config';
import axios from "axios"
import { TabPanel } from '../components/TabPanel'
import Grid from '@mui/material/Grid';
import { DataGrid, GridColDef, GridValueGetterParams } from '@mui/x-data-grid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { LineChart } from '@mui/x-charts/LineChart';
import CanvasJSReact from '@canvasjs/react-charts';
var CanvasJS = CanvasJSReact.CanvasJS;
var CanvasJSChart = CanvasJSReact.CanvasJSChart;

var toHHMMSS = (secs) => {
    var sec_num = parseInt(secs, 10)
    var hours   = Math.floor(sec_num / 3600)
    var minutes = Math.floor(sec_num / 60) % 60
    var seconds = sec_num % 60

    return [hours,minutes,seconds]
        .map(v => v < 10 ? "0" + v : v)
        .filter((v,i) => v !== "00" || i > 0)
        .join(":")
}

const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 250 },
    {
        field: 'called_times',
        headerName: 'Called times',
        type: 'number',
        width: 100,
    },
    {
        field: 'gflops',
        headerName: 'GFLOPS',
        type: 'number',
        width: 100,
    },
    {
        field: 'gflops_avg',
        headerName: 'GFLOPS/s',
        type: 'number',
        width: 100,
    },
    {
        field: 'total_exectime',
        headerName: 'Total exec time (usec)',
        type: 'number',
        width: 220,
    },
];

export class KernelPanel extends Component {
    constructor(props) {
        super(props)

        this.state = {
            kernels: Array(),
            memory_series: Array(),
            avg_gflops: 0.0,
            max_mem_used: 0.0,
            kernels_count: 0,

            total_gflops: 0.0,
            total_exectime: 0.0,
            total_kernel_calls: 0,

            kernel_code_by_name: {},
            focused_kernel: null,
        }
    }

    componentDidMount() {
        this.restore_data()
        this.props.socket.on("kernel_stat", (dt) => { this.restore_kernel_stat(JSON.parse(dt)) })
        this.props.socket.on("kernel_def", (dt) => { this.restore_kernel_def(JSON.parse(dt)) })
    }

    ev_kernel_def(data) {
        var kernel_code_by_name = this.state.kernel_code_by_name
        kernel_code_by_name[data.name] = data.src
        this.setState({ kernel_code_by_name: kernel_code_by_name })
    }

    restore_kernel_stat(data) {
        var kernels = structuredClone(this.state.kernels)
        var memory_series = structuredClone(this.state.memory_series)
        var max_mem_used = structuredClone(this.state.max_mem_used)
        var total_gflops = structuredClone(this.state.total_gflops)
        var total_exectime = structuredClone(this.state.total_exectime)
        var total_kernel_calls = structuredClone(this.state.total_kernel_calls)
        var avg_gflops = structuredClone(this.state.avg_gflops)

        Array.from(data).forEach((item) => {
            total_gflops += item.gflops
            total_exectime += item.exectime
            total_kernel_calls += 1
            var index = kernels.findIndex((el) => { return el.name === item.name })
            if (index == -1) {
                kernels.push({ id: kernels.length, name: item.name, called_times: 1, total_exectime: item.exectime, gflops: item.gflops, gflops_avg: item.gflops / (item.exectime / 1e6) })
            } else {
                const was = kernels[index]
                kernels[index].called_times += 1
                kernels[index].total_exectime += item.exectime
                kernels[index].gflops_avg = (kernels[index].called_times * item.gflops) / (kernels[index].total_exectime / 1e6)
            }

            memory_series.push({ y: item.mem_usage })
            max_mem_used = Math.max(max_mem_used, item.mem_usage)
            if (memory_series.length > 2048) {
                memory_series.shift()
            }
        })

        this.setState({
            kernels: kernels,
            memory_series: memory_series,
            kernels_count: kernels.length,
            max_mem_used: max_mem_used,
            total_gflops: total_gflops,
            total_exectime: total_exectime,
            avg_gflops: avg_gflops,
            total_kernel_calls: total_kernel_calls
        })
    }

    restore_kernel_def(data) {
        var kernel_code_by_name = structuredClone(this.state.kernel_code_by_name)
        Array.from(data).forEach((item) => {
            kernel_code_by_name[item.name] = item.src
        });
        this.setState({ kernel_code_by_name: kernel_code_by_name })
    }

    render() {
        const options = {
            theme: "light2", // "light1", "dark1", "dark2"
            animationEnabled: false,
            zoomEnabled: false,
            height: 180,
            axisY: {
                title: "gb",
                minimum: 0,
            },
            data: [{
                type: "area",
                dataPoints: this.state.memory_series
            }]
        }

        var kernel_src = this.state.focused_kernel != null ? this.state.kernel_code_by_name[this.state.focused_kernel.name] : null
        return (
            <TabPanel value={this.props.current_tab} index={this.props.index}>
                <Grid container>
                    {this.state.kernels_count == 0 ? <p style={{ "padding": "16px" }}>To collect kernel statistics use DEBUG>=2.</p> :
                        <>
                            <Grid xs={6} style={{ "padding": "16px" }}>
                                <Grid container>
                                    <Grid xs={6}>
                                        <h4>Short stat:</h4>
                                        <b>Kenrels count: </b>{this.state.kernels_count}<br />
                                        <b>Total GFLOPS: </b>{this.state.total_gflops ? this.state.total_gflops.toFixed(0) : 0}<br />
                                        <b>Total exec time: </b>{(this.state.total_exectime ? toHHMMSS(this.state.total_exectime/1e6) : 0.0)}<br />
                                        <b>Max mem used: </b>{this.state.max_mem_used ? this.state.max_mem_used.toFixed(2) : 0.0} gb<br />
                                    </Grid>
                                    <Grid xs={6}>
                                        <b>Memory usage:</b>
                                        {this.state.memory_series !== undefined && this.state.memory_series.length > 0 ? <CanvasJSChart options={options} /> : null}
                                    </Grid>
                                </Grid>
                                <DataGrid
                                    rows={this.state.kernels}
                                    columns={columns}
                                    initialState={{
                                        pagination: {
                                            paginationModel: { page: 0, pageSize: 25 },
                                        },
                                    }}
                                    pageSizeOptions={[25, 50, 100]}
                                    onCellClick={(info) => { this.setState({ focused_kernel: info.row }) }}
                                />
                            </Grid>
                            <Grid xs={6} style={{ "padding": "16px" }}>
                                {this.state.focused_kernel === null ? <Paper style={{ "padding": "16px" }}>Select kernel from the table to see more info</Paper> :
                                    <>
                                        <h3>Kernel {this.state.focused_kernel.name}</h3>
                                        {kernel_src !== undefined ? <SyntaxHighlighter language="c" style={oneLight}>
                                            {kernel_src}
                                        </SyntaxHighlighter> : "To get kernel code run tinygrad with DEBUG >= 4"}
                                    </>}
                            </Grid>
                        </>}
                </Grid>
            </TabPanel>
        )
    }

    restore_data() {
        axios.get(
            SERVER_API_URL + "restore_kernels/" + this.props.session,
        ).then(response => {
            this.restore_kernel_stat(response.data.kernel_stat)
            console.log(response.data)
            this.restore_kernel_def(response.data.kernel_def)
        }).catch(error => {
            console.log("oops", error)
        })
    }

}
