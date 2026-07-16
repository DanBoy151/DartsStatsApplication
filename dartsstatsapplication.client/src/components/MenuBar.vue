<template>
  <nav class="menu-bar">
    <ul class="menu-list">
      <li v-for="(item, index) in menuItems"
          :key="item.label"
          class="menu-item"
          @mouseenter="openDropdown(index)"
          @mouseleave="closeDropdown(index)">
        <button class="menu-button">
          {{ item.label }}
        </button>
        <ul v-if="item.dropdown && item.open" class="dropdown-list">
          <li v-for="option in item.dropdown"
              :key="option"
              class="dropdown-item dropdown-item--disabled"
              title="Coming soon"
              aria-disabled="true">
            {{ option }}
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>

<script lang="ts">
  // The dropdown items below (Fixtures, History, Team/Player/Match stats, New
  // Player, New Match) don't have pages or routes behind them yet -- there's no
  // vue-router wired up (see main.ts) and no corresponding components. They're
  // kept visible as a roadmap of what's planned, but rendered disabled so the
  // UI doesn't imply you can click through to something that doesn't exist
  // yet. Once routing lands, drop the `dropdown-item--disabled` class (and the
  // title/aria-disabled attributes) from whichever items get real pages.
  export default {
    name: 'MenuBar',
    data() {
      return {
        menuItems: [
          {
            label: 'Match',
            dropdown: ['Fixtures', 'History'],
            open: false,
          },
          {
            label: 'Statistics',
            dropdown: ['Team', 'Player', 'Match'],
            open: false,
          },
          {
            label: 'Manage',
            dropdown: ['New Player', 'New Match'],
            open: false,
          },
        ],
      };
    },
    methods: {
      openDropdown(index: number) {
        const item = this.menuItems[index];
        if (item) item.open = true;
      },
      closeDropdown(index: number) {
        const item = this.menuItems[index];
        if (item) item.open = false;
      },
    },
  };
</script>

<style scoped>
  .menu-bar {
    width: 100%;
    background: #2c3e50;
    display: flex;
    justify-content: center; /* Center the menu group */
    box-sizing: border-box;
  }

  .menu-list {
    display: flex;
    justify-content: space-between; /* Evenly space menu items */
    width: 600px; /* Fixed width for the group, adjust as needed */
    max-width: 100%;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .menu-item {
    position: relative;
  }

  .menu-button {
    background: none;
    border: none;
    color: #ecf0f1;
    font-size: 1rem;
    padding: 1rem 2rem;
    cursor: pointer;
    width: 100%;
    text-align: center;
  }

    .menu-button:hover,
    .menu-item:hover > .menu-button {
      background: #34495e;
    }

  .dropdown-list {
    position: absolute;
    top: 100%;
    left: 0;
    background: #34495e;
    min-width: 160px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    list-style: none;
    margin: 0;
    padding: 0;
    z-index: 100;
  }

  .dropdown-item {
    padding: 0.75rem 1.5rem;
    color: #ecf0f1;
    cursor: pointer;
    white-space: nowrap;
  }

    .dropdown-item:hover {
      background: #3d566e;
    }

  .dropdown-item--disabled {
    color: #93a1ac;
    cursor: not-allowed;
  }

    .dropdown-item--disabled:hover {
      background: transparent;
    }

  @media (max-width: 600px) {
    .menu-list {
      flex-direction: column;
      align-items: stretch;
      width: 100%;
      max-width: none;
    }

    .menu-item {
      width: 100%;
    }

    .menu-button {
      padding: 1rem;
    }

    .dropdown-list {
      position: static;
      box-shadow: none;
    }
  }
</style>
