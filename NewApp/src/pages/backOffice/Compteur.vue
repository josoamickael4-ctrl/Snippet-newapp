<template>

<select v-model="selected">
    <option :value="1">Option A</option>
    <option>Option B</option>
    <option>Option C</option>
</select>


<button @click="handleButton()">Ajouter</button>

</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'


//let stylo = ["rouge", "bleu", "vert"];

//console.log(stylo[2]);


// drop down ok 
// miafficher le jaouetr console ok 
// tableau 

const selected = ref(undefined);


const handleButton = () => {
    console.log("toggle");
    console.log(selected.value)
}  


</script>