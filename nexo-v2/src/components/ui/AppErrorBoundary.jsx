import { Component } from 'react'
import { IconAlertTriangle } from '@tabler/icons-react'
import { ErrorPage } from './ErrorPage.jsx'
export default class AppErrorBoundary extends Component {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  render(){
    if(this.state.failed)return <ErrorPage code="Error 500" title="No pudimos mostrar esta página" description="Ocurrió un problema inesperado. Vuelve a cargar la página o regresa al inicio para continuar." icon={IconAlertTriangle} actions={<><button className="nk-button nk-button-primary" onClick={()=>window.location.reload()}>Volver a intentar</button><a className="nk-button nk-button-secondary" href="/">Ir al inicio</a></>} />
    return this.props.children
  }
}
