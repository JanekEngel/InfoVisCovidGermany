# Setup

This application requires the following two steps to run

## Data Preparation

Firstly, the `prepare_data.py` file needs to be executed. It relies on the daily update of the [dataset by the RKI](https://github.com/robert-koch-institut/SARS-CoV-2-Infektionen_in_Deutschland). This means, that the visualization currently only works AFTER ca. 7:05am CEST, because that is the time the dataset is updated every day.

The script runs for quite some time. It downloads the current dataset, then prints a line when the download was successful. Then it compacts and prepares the data set, and then prints a success message again.

The final step verifies the data and prints the maximum values into the console.
> Beware that this consumes over 400MB of data every time it is executed. 

## Visualization

After the script is run, the `index.html` file can be opened. Here you need to make sure to open the file via some kinf of HTTPRequest, not as a local file because of CORS issues. Opening as localhost or via a local server (e.g. with the [VSCode Live Server Extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)) works. Then the visualization loads for a while. If it takes over 15sec, make sure to look into your browsers debug console(usually opened by pressing F12), to see if any errors occured.