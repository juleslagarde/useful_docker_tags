console.log("dockertags: Loaded dockertags ext")

const FAVORITE_ARCH = "amd64"
const lpath = (new URL(document.URL)).pathname.split("/");
const official = lpath[1]=="_"
//const xpath_maindiv = official?"/html/body/div[1]/div/div[2]/div/div[3]":"/html/body/div[1]/div/div[2]/div/div/div[2]/div[2]"
//const xpath_tabs = official?"/html/body/div[1]/div/div[2]/div/div[2]/div/div/div[2]/div/div":"/html/body/div[1]/div/div[2]/div/div/div[2]/div[1]/div[2]/div/div/div";
//const maindiv_selector = official?"div.MuiContainer-root:nth-child(3)":"#mainContainer > .MuiBox-root > .MuiBox-root > .MuiStack-root > .MuiContainer-root";
const maindiv_selector = official?"div.MuiContainer-root:nth-child(3)":".css-1i43dhb > div:nth-child(2)";
//const tabs_selector = ".MuiTabs-flexContainer"; 
const tabs_selector = official?"div.MuiTabs-root:nth-child(2) > div:nth-child(1) > div:nth-child(1)":"div.MuiTabs-root:nth-child(1) > div:nth-child(1) > div:nth-child(1)";
//const xpath_sidepanel= official?"/html/body/div[1]/div/div[2]/div/div[3]/div/div[2]":"/html/body/div[1]/div/div[2]/div/div/div[3]/div/div/div/div[2]";

let tabsdiv = null;
let maindiv = null;

// ============================ UTILS ====================================
async function wait_and_load_selector(selector, timeout = 5000){
  console.log("[usefull tags] waiting for '"+selector+"'")
  const endTime = Date.now() + timeout;
  let o = document.querySelector(selector);
  while(o === null && Date.now() <= endTime){
    await new Promise(resolve => setTimeout(resolve, 50));
    o = document.querySelector(selector);
  }
  if(o === null) throw new Error(`dockertags: Timeout waiting for selector: '${selector}'`);
  console.log("[usefull tags] found ! -> '"+selector+"'")
  return o;
}

function tag_digest(t){
  if(t.digest !== undefined)
    return t.digest;
  for(let im of t.images){
    if(im.status === "active" && im.architecture === FAVORITE_ARCH)
      return im.architecture +"_"+ im.digest;
  }
  const im0 = t.images[0];
  return im0.architecture +"_"+ im0.digest;
}

function find_classes(div){
  let selected_class, unselected_class = null;
  for(c of div.children){
    if(c.className.indexOf("selected")!=-1) selected_class = c.className;
    else unselected_class = c.className;
  }
  console.assert(null !== selected_class, "dockertags: tab selected classes not found")
  console.assert(null !== unselected_class, "dockertags: tab unselected classes not found")
  return [selected_class, unselected_class]
}

// ========================= EDIT PAGE ==================================

async function select_tabs(tab){
  let [selected_class, unselected_classes] = find_classes(tabsdiv);
  for(t of tabsdiv.children){
    t.className = unselected_classes;
  }
  tab.className = selected_class;
}

function display_tags(tss, div){
  function td(text, title){
    c = document.createElement("td");
    c.textContent = text;
    c.title = title;
    c.style = "padding: 5px 10px"
    return c;
  }
  const table = document.createElement("table");
  tss.forEach((ts) => {
    const row = document.createElement("tr");
    let cell = td();
    cell.innerHTML = ts.map(o=>o.name).sort().join("</br>");
    row.appendChild(cell);
    const t = ts[0];
    row.appendChild(td(t.digest.substring(0,20)+"...", t.digest));
    row.appendChild(td(t.last_updated.split("T")[0], t.last_updated));
    row.appendChild(td(Math.round(t.full_size/1024/1024)+" MB", t.full_size + " bytes"));
    table.appendChild(row);
  });
  div.innerHTML = "";
  div.appendChild(table);
}

async function load_pretty_tags(event){
  select_tabs(event.target);
  console.log("dockertags: requestings tags !")
  const p = official?"library/"+lpath[2]:lpath[2]+"/"+lpath[3];
  const o = await fetch("https://hub.docker.com/v2/repositories/"+p+"/tags/?page_size=100&page=1");
  const j = await o.json();
  const d={};
  for(t of j.results){
    if(t.tag_status === "inactive") continue;
    t.digest = tag_digest(t);
    if(!(t.digest in d))
      d[t.digest]=[];
    d[t.digest].push(t);
  }
  ts = Object.values(d);
  maindiv ||= await wait_and_load_selector(maindiv_selector);
  display_tags(ts, maindiv);
}

async function add_tab(div){
  console.log("dockertags: page loaded, editing...")
  tabsdiv = div;
  let [_, unselected_classes] = find_classes(tabsdiv);

  const link = document.createElement("a");
  link.href = "javascript:void(0)";
  link.textContent = "Useful Tags";
  link.className = unselected_classes;
  link.addEventListener("click", load_pretty_tags);
    
  tabsdiv.appendChild(link);
}

wait_and_load_selector(tabs_selector).then(add_tab);
