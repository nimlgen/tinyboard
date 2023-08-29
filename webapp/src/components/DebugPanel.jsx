import { Component } from "react";
import { TextField, Switch, Paper, Select, MenuItem, FormControl, ToggleButtonGroup, ToggleButton } from '@mui/material'
import { SERVER_API_URL } from '../config';
import axios from "axios"
import { TabPanel } from '../components/TabPanel'
import Grid from '@mui/material/Grid';
import { DataGrid, GridColDef, GridValueGetterParams } from '@mui/x-data-grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark as dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { styled } from '@mui/material/styles';
import { Graphviz } from 'graphviz-react';
import uniqolor from 'uniqolor';
import debounce from 'lodash.debounce';

export class DebugPanel extends Component {
    constructor(props) {
        super(props)

        this.state = {
            graph_storage: {},
            kernel_to_color: {},
            lazyop_to_kernel: {},
            mlop_info: {},
            focused_function: "",

            mlop_node_to_examine: "",
            graph_controls_focused_type: "mlops",
            graph_controls_colorized_graph: false,
            graph_controls_group_tensor_operations: false,
        }

        this.on_node_id_input = debounce(this.on_node_id_input, 500)
    }

    componentDidMount() {
        this.restore_data()
        this.props.socket.on("func_debug", (dt) => { this.restore_func_debug(JSON.parse(dt)) })
        this.props.socket.on("lazyops_to_kernel", (dt) => { this.restore_lazyops_to_kernel(JSON.parse(dt)) })
    }

    restore_func_debug(data) {
        var graph_storage = structuredClone(this.state.graph_storage)
        var mlop_info = structuredClone(this.state.mlop_info)
        var tensor_frame_uid_nodes = {}
        var tensor_function_uid_to_name = {}
        Array.from(data).forEach((item) => {
            Array.from(JSON.parse(item.mlops_info)).forEach((info) => {
                console.log(info)
                if (tensor_frame_uid_nodes[info.tensor_frame_uid] === undefined) {
                    tensor_function_uid_to_name[info.tensor_frame_uid] = "Tensor." + info.tensor_function + "()"
                    tensor_frame_uid_nodes[info.tensor_frame_uid] = []
                }
                tensor_frame_uid_nodes[info.tensor_frame_uid].push(info.node)
                mlop_info[info.node] = { "tensor_function": info.tensor_function, "stack": info.stack }
            })
            graph_storage[item.function_name] = {
                'mlops_graph': item.mlops_graph, 'lazyops_graph': item.lazyops_graph,
                'tensor_function_uid_to_name': tensor_function_uid_to_name, 'tensor_frame_uid_nodes': tensor_frame_uid_nodes
            }
        });
        this.setState({ graph_storage: graph_storage, mlop_info: mlop_info })
    }

    restore_lazyops_to_kernel(data) {
        var lazyop_to_kernel = structuredClone(this.state.lazyop_to_kernel)
        var kernel_to_color = structuredClone(this.state.kernel_to_color)
        Array.from(data).forEach((item) => {
            if (kernel_to_color[item.kernel_name] === undefined) {
                kernel_to_color[item.kernel_name] = uniqolor.random().color
            }
            Array.from(JSON.parse(item.lazyops)).forEach((lop) => {
                lazyop_to_kernel[lop] = kernel_to_color[item.kernel_name]
            })
        });
        this.setState({ lazyop_to_kernel: lazyop_to_kernel, kernel_to_color: kernel_to_color })
    }

    on_node_id_input = (val) => {
        this.setState({ mlop_node_to_examine: val })
    }

    render() {
        var graph = this.state.focused_function != "" ?
            this.state.graph_controls_focused_type == "mlops" ? this.state.graph_storage[this.state.focused_function].mlops_graph : this.state.graph_storage[this.state.focused_function].lazyops_graph
            : null

        var colors_in_graph = []
        // TODO: Patching graphs here is really bad...
        if (graph !== null && this.state.graph_controls_focused_type == "lazyops" && this.state.graph_controls_colorized_graph) {
            for (const [lop, value] of Object.entries(this.state.lazyop_to_kernel)) {
                const wl = graph.length
                graph = graph.replace(`\n${lop} [color=black,`, `\n${lop}[style=filled, fillcolor="${value}"`)
                if (wl != graph.length) {
                    colors_in_graph.push(value)
                }
            }
        }
        if (graph !== null && this.state.graph_controls_focused_type == "mlops" && this.state.graph_controls_group_tensor_operations) {
            graph = graph.substring(0, graph.length - 2);
            for (const [uid, value] of Object.entries(this.state.graph_storage[this.state.focused_function].tensor_frame_uid_nodes)) {
                graph += `subgraph cluster_${uid} {
                    style=filled;
                    color="#e0e0e0";
                    ${value.join(" ")};
                    label = "${this.state.graph_storage[this.state.focused_function].tensor_function_uid_to_name[uid]}";
                  }
                `
            }
            graph += "}"
        }

        // TODO: Better guide how to collect graphs.
        return (
            <TabPanel value={this.props.current_tab} index={this.props.index}>
                <Grid container>
                    <Grid xs={8} style={{ "padding": "16px" }}>
                        {graph != null ?
                            <Graphviz dot={graph}
                                options={{
                                    fit: true,
                                    zoom: true,
                                    width: "100%",
                                    height: "100%",
                                }} /> : <p>To inspect a function use <i>@tinyboard_inspector</i> to collect information about the graph produced by the function.</p>}
                    </Grid>
                    <Grid xs={4} style={{ "padding": "16px" }}>
                        <Paper style={{ "padding": "16px" }}>
                            <h5>Function to view</h5>
                            <FormControl fullWidth>
                                <Select
                                    value={this.state.focused_function}
                                    onChange={(ev) => { this.setState({ focused_function: ev.target.value }) }}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {
                                        Object.keys(this.state.graph_storage).map((key, index) => (
                                            <MenuItem value={key}>{key}</MenuItem>
                                        ))
                                    }
                                </Select>
                            </FormControl>
                            <hr />
                            <h5>Graph controls</h5>
                            <div>Type:</div>
                            <ToggleButtonGroup
                                value={this.state.graph_controls_focused_type}
                                onChange={(ev) => { this.setState({ graph_controls_focused_type: ev.target.value }) }}
                                exclusive
                            >
                                <ToggleButton value="mlops">mlops</ToggleButton>
                                <ToggleButton value="lazyops">lazyops</ToggleButton>
                            </ToggleButtonGroup>
                            {
                                false && this.state.graph_controls_focused_type == "lazyops" ?
                                    <><br /><FormControlLabel style={{ marginTop: "16px" }} control={<Switch onChange={(ev) => { this.setState({ graph_controls_colorized_graph: ev.target.checked }) }} />} label="Colorize kernels" />
                                    </> : null
                            }
                            {
                                this.state.graph_controls_focused_type == "mlops" ?
                                    <><br /><FormControlLabel style={{ marginTop: "16px" }} control={<Switch onChange={(ev) => { this.setState({ graph_controls_group_tensor_operations: ev.target.checked }) }} />} label="Group by tensor operations" />
                                    </> : null
                            }
                            {
                                this.state.graph_controls_focused_type == "lazyops" && this.state.graph_controls_colorized_graph ?
                                    <>
                                        <hr />
                                        <h5>Legend</h5>
                                        Node color to kernel:
                                        {
                                            Object.keys(this.state.kernel_to_color).map((key, index) => (
                                                <>
                                                    {colors_in_graph.indexOf(this.state.kernel_to_color[key]) > -1 ?
                                                        <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}><div style={{ display: "inline-block", background: this.state.kernel_to_color[key], borderRadius: "50%", width: "24px", height: "24px", marginRight: "8px" }}></div><div style={{ display: "inline-block" }}>{key}</div></div>
                                                        : null}
                                                </>
                                            ))
                                        }
                                    </> : null
                            }

                        </Paper>
                        {
                            this.state.graph_controls_focused_type == "mlops" ?
                                <Paper style={{ padding: "16px", marginTop: "16px" }}>
                                    <h5>Examine node</h5>
                                    <TextField id="outlined-basic" label="Node ID" onChange={(ev) => { this.on_node_id_input(ev.target.value) }} variant="outlined" />
                                    {
                                        this.state.mlop_info[parseInt(this.state.mlop_node_to_examine)] !== undefined ?
                                            <>
                                                <div style={{ marginTop: "16px" }}>Stack traceback:</div>
                                                {
                                                    this.state.mlop_info[parseInt(this.state.mlop_node_to_examine)].stack.map((item, i) => {
                                                        return (<div>
                                                            <div><b>{i + 1}. {item[0]}()</b></div>
                                                            <div style={{ fontSize: ".8em", wordBreak: "break-all" }} ><i>{item[1]}:{item[2]}</i></div>
                                                            <SyntaxHighlighter language="python" style={dark}>{item[3]}</SyntaxHighlighter>
                                                        </div>)
                                                    })
                                                }
                                            </> :
                                            this.state.mlop_node_to_examine !== "" ?
                                                <p>No data for the node. Run with DEBUG >= 3 to collect stack frames</p> : <p>Input NodeID of mlops you want to examine. It's in the () in the graph</p>
                                    }
                                </Paper>
                                : null
                        }
                    </Grid>
                </Grid>
            </TabPanel>
        )
    }

    restore_data() {
        axios.get(
            SERVER_API_URL + "restore_func_debug/" + this.props.session,
        ).then(response => {
            // console.log(response.data)
            this.restore_func_debug(response.data.func_debug)
            this.restore_lazyops_to_kernel(response.data.lazyops_to_kernel)
        }).catch(error => {
            console.log("oops", error)
        })
    }

}
