<script lang="ts">
  import { format, subMonths } from 'date-fns'
  import { Line } from 'svelte-chartjs'

  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import {
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
  } from 'chart.js'

  ChartJS.register(
    Title,
    Tooltip,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    CategoryScale,
  )

  // Calculate the last six months
  const getLastSixMonths = () => {
    let currentDate = new Date()

    let months = Array.from({ length: 6 }, (_, index) => {
      let date = subMonths(currentDate, index)
      return format(date, 'MMM') // format as you need, e.g. 'yyyy-MM' will be '2023-09'
    })

    return months.reverse() // to have them in ascending order
  }

  // Set the default data object for the chart
  let data: any = {}

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
          data: [24, 3, 16, 56, 55, Math.ceil(0 / 60)],
        },
      ],
    }
  }

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: 'linear',
        title: {
          text: 'Minutes',
          display: true,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  }
</script>

<Card block={false}>
  <CardHeader>Usage</CardHeader>

  <div class="h-full relative">
    <div class="h-full blur">
      <Line {data} {options} />
    </div>

    <div
      class="inset-center z-10 border-info border-2 rounded-2xl mx-auto w-full"
    >
      <div class="alert">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="stroke-info shrink-0 w-6 h-6"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path></svg
        >
        <span>Usage Charts Coming Soon</span>
      </div>
    </div>
  </div>
</Card>

<style>
  .inset-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
</style>
