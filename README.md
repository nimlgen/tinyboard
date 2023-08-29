TinyBoard is a web applications for inspecting and understanding your [tinygrad](https://github.com/tinygrad/tinygrad) runs and graphs.

## Features
* Visualizations Dashboards
* Function inspector
* Kernel Performance Metrics

### Visualizations Dashboards

TinyBoard features a visualization tool that allows you to track scalar statistics over time. It is particularly useful for monitoring metrics like the model's loss or learning rate. Just call
```python
from extra.tinyboard import tinyboard_log_graph
for i in range(100):
    # something
    tinyboard_log_graph("Train stat", "line", [[loss_cpu]], graphinfo={'series_names': ['loss']})
```

### Function inspector

TinyBoard allows to take a look beyond python lines to get the full picture of operations you perform. Choose a function you want to inspect, add a `@tinyboard_inspector()` and during you run tinygrad will collect operations on tensors and how they are translated into `mlops` and `lazyops`.
```python
from extra.tinyboard import tinyboard_inspector

@tinyboard_inspector()
def make_square_mask(X, mask_size):
  d_y = Tensor.arange(0, X.shape[-2]).reshape((1,1,X.shape[-2],1))
  d_x = Tensor.arange(0, X.shape[-1]).reshape((1,1,1,X.shape[-1]))
  # ...
```

## Run on tinygrad
To enable tinygrad to log data to the tinyboard set the `TINYBOARD=1` env variable. You can also setup a board name with `TINYBOARD_NAME="you name goes here"`.

## How to run server

TinyBoard is a React + Flask app. So the prerequirements are the following:
* Install npm
* Install python

### Production
```bash
make deps # run one time to install deps
make build # rebuild npm after any changes
make run
```
Both UI and Server runs at port 4334.

### Dev
```bash
make deps # run one time to install deps
make dev
```
UI runs on the port 3000 and Server runs on the port 4334.



Run demo: `TINYBOARD=1 TINYBOARD_NAME="CIFAR Training" GPU=1 DEBUG=4 BS=64 STEPS=400 python3 examples/hlb_cifar10.py`
