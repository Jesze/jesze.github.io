var startsize = 100;
var xsize = 100, ysize = 100;
var leavex, leavey;
var shrink;
var clicked = false;


$('#image1').mousemove(function(e)
{
	var offs = $(this).offset(),
		p    = {x:offs.left, y:offs.top},
		mPos = {x:e.pageX, y:e.pageY},
		x    = mPos.x - p.x - xsize,
		y    = mPos.y - p.y - ysize;

	$('#image2', this).css({left:x, top:y, backgroundPosition: -x+'px '+-y+'px', width:xsize*2, height:ysize*2});
    
})
.mouseleave(function(p)
{	
	leavex = p.pageX;
	leavey = p.pageY;
	shrink = setInterval(shrinkCircle,5);
})

.mouseenter(function()
{
	clearInterval(shrink);
	xsize = startsize;
	ysize = startsize;
})
.mousedown(function()
{	
	clicked = !clicked;
	if(clicked)
		this.style.backgroundImage = "url('images/wireframe.jpg')";
	else
		this.style.backgroundImage = "url('images/nonwireframe.jpg')";
});

function shrinkCircle()
{
	xsize--;
	ysize--;
	var offs = $('#image1').offset(),
		p    = {x:offs.left, y:offs.top},
		mPos = {x:leavex, y:leavey},
		x    = mPos.x - p.x - xsize,
		y    = mPos.y - p.y - ysize;

	$('#image2', '#image1').css({left:x, top:y, backgroundPosition: -x+'px '+-y+'px', width:xsize*2, height:ysize*2});	
	if(xsize == 0 || ysize == 0)
		clearInterval(shrink);
}