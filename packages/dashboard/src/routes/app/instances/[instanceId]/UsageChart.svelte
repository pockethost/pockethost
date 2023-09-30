<script lang="ts">
  import { Line } from 'svelte-chartjs'
  import { subMonths, format } from 'date-fns';
  import { instance } from './store'

  import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    CategoryScale,
  } from 'chart.js';

  ChartJS.register(
    Title,
    Tooltip,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    CategoryScale
  );

  $: ({ secondsThisMonth } = $instance)

  // Calculate the last six months
  const getLastSixMonths = () => {
    let currentDate = new Date();

    let months = Array.from({ length: 6 }, (_, index) => {
      let date = subMonths(currentDate, index);
      return format(date, 'MMM'); // format as you need, e.g. 'yyyy-MM' will be '2023-09'
    });

    return months.reverse(); // to have them in ascending order
  }

  // Set the default data object for the chart
  let data = {};

  // This will watch for changes in the `secondsThisMonth` variable and update the chart data
  $: {
    data = {
      labels: getLastSixMonths(),
      datasets: [
        {
          label: 'Usage',
          fill: true,
          lineTension: 0.3,
          backgroundColor: '#1eb854',
          borderColor: '#1eb854',
          borderCapStyle: 'round',
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: 'miter',
          pointBorderColor: '#fff',
          pointBackgroundColor: '#fff',
          pointBorderWidth: 5,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#1eb854',
          pointHoverBorderColor: 'rgba(220, 220, 220,1)',
          pointHoverBorderWidth: 2,
          pointRadius: 1,
          pointHitRadius: 25,
          data: [24, 3, 16, 56, 55, Math.ceil(secondsThisMonth / 60)],
        },
      ],
    };
  }

  let options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: 'linear',
        title: {
          text: 'Minutes',
          display: true
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
    }
  };
</script>

<div class='card card-body bg-base-200 h-full'>
  <h3 class='text-xl font-bold mb-16'>Usage</h3>

  <div class='h-full'>
    <Line {data} {options}  />
  </div>
</div>
