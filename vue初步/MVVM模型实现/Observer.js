class Watcher{
  constructor(vm,expr,cb){
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;
    //先把旧值保存起来
    this.oldVal = this.getOldVal()
  }
  getOldVal(){
    //挂载this
    Dep.target = this;
    const oldVal = compileUtil.getVal(this.expr,this.vm);
    //销毁
    Dep.target = null;
    return oldVal;
  }
  update(){
    const newVal = compileUtil.getVal(this.expr,this.vm);
    if(newVal !== this.oldVal){
      this.cb(newVal);
    }
  }
}
class Dep{
  constructor(){
    this.subs = [];
  }
  //收集观察者
  addSub(watcher){
    this.subs.push(watcher);
  }
  //通知观察者去更新
  notify(){
    console.log('观察者',this.subs);
    this.subs.forEach(w=>w.update())
  }
}
class Observer{
  constructor(data){
    this.observe(data);
  }
  observe(data){
  /*{
      person:{
        name: '张三',
        fav: {
          a: '爱好'
        }
      }
    }*/

    if(data && typeof data === 'object'){
      Object.keys(data).forEach(key=>{
      this.defineReactive(data,key,data[key]);
      })
    }
  }
  defineReactive(obj,key,value){
    // 递归遍历回调
    this.observe(value);
    // 将Dep和Observer关联
    const dep = new Dep(); 
    //劫持并监听所有的属性
    //defineProperty当对象中不存在指定的属性时，将根据描述符创建一个新的属性。
    Object.defineProperty(obj,key,{
      enumerable:true,
      configurable:false,
      get(){
        //初始化
        //订阅数据变化时，往Dep中添加观察者
        Dep.target && dep.addSub(Dep.target);
        return value;
      },
      set:(newVal)=>{ 
        if(newVal !== value){
          value = newVal;
        }
        //告知Dep通知变化
        dep.notify()
      }
    })
  }
}