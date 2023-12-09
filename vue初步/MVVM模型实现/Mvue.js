
//定义compileUtile 的对象
const compileUtil = {
  getVal(expr,vm){
    return expr.split('.').reduce((data,currentVal)=>{
      return data[currentVal];
    },vm.$data);
  },
  setVal(expr,vm,inputVal){
    return expr.split('.').reduce((data,currentVal) =>{
      data[currentVal] = inputVal;
    },vm.$data);
  },
  getContentVal(expr,vm){
      return expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{    
        return this.getVal(args[1],vm);
      })
  },
  text(node,expr,vm){ //expr:msg 
    let value;
    if(expr.indexOf('{{') !== -1){
      //{{persion.name}}--{{persion.age}}
      // console.log(expr);
      value = expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{
        //更新当前值的同时还需要绑定Watcher 订阅数据变化，绑定更新函数
        new Watcher(vm,args[1],(newVal)=>{
          this.updater.textUpdater(node,this.getContentVal(expr,vm));
        })
        // 打印{{}}匹配项 
        // 0: "{{person.name}}"
        // 1: "persion.name"
        // 2: 0
        // 3: "{{person.name}}--{{person.age}}"
        // 选择args[1] 
        return this.getVal(args[1],vm);
      })
    }else{
      value = this.getVal(expr,vm)
    }
    this.updater.textUpdater(node,value)
  },
  html(node,expr,vm){
    let value = this.getVal(expr,vm); //html
    //更新当前值的同时还需要绑定Watcher 订阅数据变化，绑定更新函数
    new Watcher(vm,expr,(newVal)=>{
      this.updater.htmlUpdater(node,newVal);
    })
    this.updater.htmlUpdater(node,value);
  },
  model(node,expr,vm){
    const value = this.getVal(expr,vm); //model
    //更新当前值的同时还需要绑定Watcher 订阅数据变化，绑定更新函数 绑定更新函数 数据-》视图
    new Watcher(vm,expr,(newVal)=>{
      this.updater.modelUpdater(node,newVal);
    });
    //视图 -> 数据-> 视图
    node.addEventListener('input',(e)=>{
      //设置值
      this.setVal(expr,vm,e.target.value);  
    });
    this.updater.modelUpdater(node,value)
  },
  on(node,expr,vm,eventName){
    let fn = vm.$options.methods && vm.$options.methods[expr];
    //bind需要绑定vm 绑定实例
    //
    //important   (eventName,fn.bind(vm),false);
    node.addEventListener(eventName,fn.bind(vm),false);
  },
  bind(node,expr,vm,attrName){

  },
  //更新的函数
  updater:{
    textUpdater(node,value){
      //渲染文本内容
      node.textContent = value;
    },
    htmlUpdater(node,value){
      //渲染html的内容
      node.innerHTML = value;
    },
    modelUpdater(node,value){
      //渲染model的内容
      node.value = value;
    }
  }

}

class Compile{
  constructor(el,vm){
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    // console.log(this.el);
    this.vm = vm;
    //1、获取文档碎片数据，放入内存中会减少页面的回流和重绘
    const fragment = this.node2Fragment(this.el);
    // console.log(fragment);
    // 2、编译模板
    this.compile(fragment);
    // 3、追加子元素到根元素
    this.el.appendChild(fragment);
  }
  compile(fragment){
    // 1、获取子节点
    const childNodes = fragment.childNodes;
    [...childNodes].forEach(child=>{
      // console.log(child); 
      if(this.isElementNode(child)){
        //是元素节点
        //编译元素节点
        // console.log('元素节点',child)
        this.compileElment(child);
      }else{
        //文本节点
        //编译文本节点
        // console.log('文本节点',child)
        this.compileText(child);        
      }
      if(child.childNodes && child.childNodes.length){
        this.compile(child);
      }
    })
  }
  compileElment(node){
    // 先找到元素的属性包含v-text、v-html等等
    const attributes = node.attributes;
    [...attributes].forEach(attr=>{
      // name所包含的就是指令的名字例如 v-text v-html v-model v-on:click v-bind:src
      const {name,value} = attr;
      if(this.isDirective(name)){ //判断是够是v-开头的指令，
        const [,directive] = name.split('-'); //得到 text html on等等
        const [dirName,eventName] = directive.split(':'); //分割从：
        //更新数据  数据驱动视图
        compileUtil[dirName](node,value,this.vm,eventName);
        //删除有指令的标签上的属性
        node.removeAttribute('v-'+directive);
      }else if(this.isEventName(name)){ //@click='handlerClick'
        const [,eventName] = name.split('@');
        compileUtil['on'](node,value,this.vm,eventName);        
      }
    })

  }
  compileText(node){
    // //编译文本 {{}}  v-text
    const content = node.textContent;
    if(/\{\{(.+?)\}\}/.test(content)){
    //“.”表示任意字符。“+”表示前面表达式一次乃至多次。“?”表示匹配模式是非贪婪的,匹配最短字符串。
      // console.log(content);
      compileUtil['text'](node,content,this.vm);
    }
  }
  isEventName(attrName){
    return attrName.startsWith('@');
  }
  isDirective(attrName){
    //startswitch()作用：判断字符串是否以指定字符或子字符串开头
    return attrName.startsWith('v-');
  }
  node2Fragment(el){ 
    //创建文档碎片
    const f = document.createDocumentFragment();
    let firstChild;
    while (firstChild = el.firstChild){
      f.appendChild(firstChild);
    }
    return f;
  }
  isElementNode(node){
    return node.nodeType === 1;
  }
}
class Mvue{
  constructor(options){
    this.$el = options.el;
    this.$data = options.data;
    this.$options = options;
    if(this.$el){
      //1、实现一个数据观察者
      new Observer(this.$data);
      //2、实现一个指令解析器
      new Compile(this.$el,this);
      //3、实现代理数据
      this.proxyData(this.$data);
    }
  }
  //代理函数
  proxyData(data){
    for(const key in data){
      // console.log(key);
      Object.defineProperty(this,key,{
        get(){
          return data[key];
        },
        set(newVal){
          data[key] = newVal;
        }
      })
    }
  }
}